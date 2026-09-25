package com.serviceops.modules.invoice.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.invoice.dto.request.RecurringInvoiceRunReq;
import com.serviceops.modules.invoice.dto.request.RecurringScheduleReq;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceRes;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceRunRes;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceSkipRes;
import com.serviceops.modules.invoice.dto.response.RecurringScheduleRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.RecurringInvoiceSchedule;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.RecurringInvoiceScheduleRepository;
import com.serviceops.modules.invoice.service.RecurringInvoiceService;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * NCL-10-CN-005: hoa don dinh ky cho hop dong duy tri (QTN-19).
 *
 * <p>Dung chung bang {@code invoices} voi NCL-10-CN-001..004 (khong co truong rieng cho nguon phat
 * sinh); hoa don dinh ky phan biet bang tien to ma "INV-" giong hoa don theo moc va {@code note}
 * ghi ro ky. Quy tac chinh:</p>
 * <ul>
 *   <li>Chi hop dong loai {@link ContractType#MAINTENANCE} moi khai bao duoc dieu khoan dinh
 *       ky, moi hop dong toi da mot dieu khoan dang hieu luc.</li>
 *   <li>{@link #run} ra soat toan bo dieu khoan {@code active}: dieu khoan nao co
 *       {@code billingDayOfMonth} trung ngay {@code asOf} VA chua sinh cho ky nay
 *       ({@code lastGeneratedPeriod}) moi duoc xu ly (TC-01).</li>
 *   <li>Hop dong da het hieu luc (qua {@code endDate}, hoac trang thai TERMINATED/COMPLETED)
 *       tai ngay {@code asOf} thi bo qua va bao ly do de Ke toan kiem tra gia han (TC-02),
 *       khong tao hoa don.</li>
 *   <li>Truoc khi tao, dung lai {@link ContractValueLimitValidator} (cung quy tac voi
 *       NCL-10-CN-002) de kiem tra QTN-19 — vuot gia tri/han muc hop dong thi bo qua kem ly do
 *       thay vi chan ca lan chay.</li>
 *   <li>TC-04: moi lan tao hoa don hoac thay doi dieu khoan deu ghi Nhat ky he thong.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RecurringInvoiceServiceImpl implements RecurringInvoiceService {

	private static final DateTimeFormatter PERIOD_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");
	private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
	private static final String ACCOUNTANT_ROLE_CODE = "VT-05";

	private final RecurringInvoiceScheduleRepository scheduleRepository;
	private final InvoiceRepository invoiceRepository;
	private final ContractRepository contractRepository;
	private final ContractValueLimitValidator limitValidator;
	private final AuditLogService auditLogService;
	private final UserRoleScopeRepository userRoleScopeRepository;
	private final NotificationService notificationService;
	private final Clock clock;

	@Override
	public RecurringScheduleRes createSchedule(Long contractId, RecurringScheduleReq request) {
		Contract contract = requireContract(contractId);
		requireMaintenanceType(contract);

		if (scheduleRepository.findByContractId(contractId).isPresent()) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
					"Hop dong nay da co dieu khoan lap hoa don dinh ky");
		}

		LocalDateTime now = LocalDateTime.now(clock);
		RecurringInvoiceSchedule schedule = new RecurringInvoiceSchedule();
		schedule.setContractId(contractId);
		schedule.setBillingDayOfMonth(request.billingDayOfMonth());
		schedule.setAmount(request.amount());
		schedule.setActive(request.active() == null || request.active());
		schedule.setNotes(request.notes());
		schedule.setCreatedBy(currentUsername());
		schedule.setCreatedAt(now);
		RecurringInvoiceSchedule saved = scheduleRepository.save(schedule);

		auditLogService.record("Khai báo hóa đơn định kỳ", AuditTargetType.INVOICE, saved.getId(),
				"Hóa đơn định kỳ cho hợp đồng duy trì",
				"Hợp đồng " + contract.getContractCode() + ": lập ngày " + saved.getBillingDayOfMonth()
						+ " hằng tháng, giá trị " + saved.getAmount().toPlainString());

		return toRes(saved);
	}

	@Override
	public RecurringScheduleRes updateSchedule(Long contractId, RecurringScheduleReq request) {
		RecurringInvoiceSchedule schedule = requireSchedule(contractId);
		Contract contract = requireContract(contractId);

		schedule.setBillingDayOfMonth(request.billingDayOfMonth());
		schedule.setAmount(request.amount());
		if (request.active() != null) {
			schedule.setActive(request.active());
		}
		schedule.setNotes(request.notes());
		schedule.setUpdatedAt(LocalDateTime.now(clock));
		RecurringInvoiceSchedule saved = scheduleRepository.save(schedule);

		auditLogService.record("Cập nhật hóa đơn định kỳ", AuditTargetType.INVOICE, saved.getId(),
				"Hóa đơn định kỳ cho hợp đồng duy trì",
				"Hợp đồng " + contract.getContractCode() + ": lập ngày " + saved.getBillingDayOfMonth()
						+ " hằng tháng, giá trị " + saved.getAmount().toPlainString()
						+ (Boolean.FALSE.equals(saved.getActive()) ? " (đã tắt)" : ""));

		return toRes(saved);
	}

	@Override
	@Transactional(readOnly = true)
	public RecurringScheduleRes getSchedule(Long contractId) {
		return toRes(requireSchedule(contractId));
	}

	@Override
	public RecurringInvoiceRunRes run(RecurringInvoiceRunReq request) {
		LocalDate asOf = request != null && request.asOf() != null ? request.asOf() : LocalDate.now(clock);
		String currentPeriod = YearMonth.from(asOf).format(PERIOD_FORMAT);

		List<RecurringInvoiceRes> created = new ArrayList<>();
		List<RecurringInvoiceSkipRes> skipped = new ArrayList<>();

		for (RecurringInvoiceSchedule schedule : scheduleRepository.findByActiveTrue()) {
			if (!schedule.getBillingDayOfMonth().equals(asOf.getDayOfMonth())) {
				continue; // Chua den ngay lap hoa don trong thang cua dieu khoan nay.
			}
			if (currentPeriod.equals(schedule.getLastGeneratedPeriod())) {
				continue; // Ky nay da sinh roi (chay lai trong cung ngay khong tao trung).
			}

			// Khoa ghi hop dong: hai luot chay/chay-tay cung luc cho cung hop dong xep hang tuan tu,
			// khong cung doc "tong da xuat" cu roi cung vuot QTN-19 (giong NCL-10-CN-002).
			Contract contract = contractRepository.findByIdForUpdate(schedule.getContractId()).orElse(null);
			if (contract == null) {
				skipped.add(new RecurringInvoiceSkipRes(schedule.getContractId(),
						"Không tìm thấy hợp đồng gắn với điều khoản này"));
				continue;
			}
			if (isExpired(contract, asOf)) {
				skipped.add(new RecurringInvoiceSkipRes(contract.getId(),
						"Hợp đồng " + contract.getContractCode()
								+ " đã hết hiệu lực (trạng thái " + contract.getStatus()
								+ (contract.getEndDate() != null ? ", ngày kết thúc " + contract.getEndDate() : "")
								+ "), cần kiểm tra việc gia hạn trước khi lập hóa đơn"));
				continue;
			}

			BigDecimal amount = schedule.getAmount().setScale(2, RoundingMode.HALF_UP);
			BigDecimal alreadyInvoiced = invoiceRepository.sumActiveTotalByContractId(contract.getId())
					.setScale(2, RoundingMode.HALF_UP);
			try {
				limitValidator.validate(contract, alreadyInvoiced, amount);
			} catch (BusinessRuleException ex) {
				// QTN-19: vuot gia tri/han muc hop dong — bo qua kem ly do thay vi chan ca luot chay.
				skipped.add(new RecurringInvoiceSkipRes(contract.getId(), ex.getMessage()));
				continue;
			}

			Invoice invoice = generateInvoice(contract, amount, asOf);
			schedule.setLastGeneratedPeriod(currentPeriod);
			schedule.setUpdatedAt(LocalDateTime.now(clock));
			scheduleRepository.save(schedule);

			auditLogService.record("Lập hóa đơn định kỳ", AuditTargetType.INVOICE, invoice.getId(),
					invoice.getInvoiceCode(),
					"Hợp đồng " + contract.getContractCode() + ": hóa đơn " + invoice.getInvoiceCode()
							+ " kỳ " + currentPeriod + ", giá trị " + invoice.getTotalAmount().toPlainString()
							+ " (tổng đã xuất " + alreadyInvoiced + " -> " + alreadyInvoiced.add(amount) + ")");
			notifyAccountants(contract, invoice, currentPeriod);

			created.add(toInvoiceRes(invoice, asOf));
		}

		return new RecurringInvoiceRunRes(asOf, created, skipped);
	}

	private Invoice generateInvoice(Contract contract, BigDecimal amount, LocalDate asOf) {
		YearMonth period = YearMonth.from(asOf);
		LocalDateTime now = LocalDateTime.now(clock);

		Invoice invoice = new Invoice();
		invoice.setInvoiceCode(generateInvoiceCode(asOf));
		invoice.setContractId(contract.getId());
		invoice.setCustomerId(contract.getCustomerId());
		invoice.setStatus(InvoiceStatus.DRAFT);
		invoice.setTotalAmount(amount);
		invoice.setInvoiceDate(asOf);
		invoice.setDueDate(asOf.plusDays(Invoice.DEFAULT_PAYMENT_TERM_DAYS));
		invoice.setNote("Hóa đơn định kỳ kỳ " + period.format(PERIOD_FORMAT));
		invoice.setCreatedBy(currentUsername());
		invoice.setCreatedAt(now);
		invoice.setUpdatedAt(now);
		return invoiceRepository.save(invoice);
	}

	/**
	 * TC-01: "bao cho ke toan" — gui thong bao trong ung dung cho toan bo Ke toan (VT-05) khi mot hoa don
	 * dinh ky vua duoc tu dong tao, cung mau voi NCL-10-CN-001 (INVOICE_PROPOSAL_CREATED) va NCL-10-CN-006
	 * (DUNNING_REMINDER). Rieng voi ban ghi nhat ky he thong (chi tra cuu duoc, khong chu dong bao ai).
	 */
	private void notifyAccountants(Contract contract, Invoice invoice, String period) {
		Set<Long> accountants = new LinkedHashSet<>(
				userRoleScopeRepository.findUserIdsByRoleCode(ACCOUNTANT_ROLE_CODE));
		String title = "Hóa đơn định kỳ vừa được lập";
		String content = "Hợp đồng " + contract.getContractCode() + " kỳ " + period + ": hóa đơn nháp "
				+ invoice.getInvoiceCode() + " giá trị " + invoice.getTotalAmount().toPlainString()
				+ " đang chờ soát và phát hành.";
		for (Long accountantId : accountants) {
			notificationService.sendInAppNotification(accountantId, NotificationType.RECURRING_INVOICE_GENERATED,
					title, content, invoice.getId(), "Invoice");
		}
	}

	/** INV-yyyyMMdd-XXXXXX, cung quy uoc voi hoa don theo moc (NCL-10-CN-002); UNIQUE(invoice_code) chan trung. */
	private String generateInvoiceCode(LocalDate date) {
		String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
		return "INV-" + CODE_DATE.format(date) + "-" + suffix;
	}

	private boolean isExpired(Contract contract, LocalDate asOf) {
		if (contract.getStatus() == ContractStatus.TERMINATED || contract.getStatus() == ContractStatus.COMPLETED) {
			return true;
		}
		return contract.getEndDate() != null && asOf.isAfter(contract.getEndDate());
	}

	private void requireMaintenanceType(Contract contract) {
		if (contract.getContractType() != ContractType.MAINTENANCE) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi hop dong duy tri (loai MAINTENANCE) moi khai bao duoc dieu khoan lap hoa don dinh ky");
		}
	}

	private Contract requireContract(Long contractId) {
		return contractRepository.findById(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong"));
	}

	private RecurringInvoiceSchedule requireSchedule(Long contractId) {
		return scheduleRepository.findByContractId(contractId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Hop dong chua khai bao dieu khoan lap hoa don dinh ky"));
	}

	private RecurringScheduleRes toRes(RecurringInvoiceSchedule schedule) {
		return new RecurringScheduleRes(schedule.getId(), schedule.getContractId(), schedule.getBillingDayOfMonth(),
				schedule.getAmount(), schedule.getActive(), schedule.getLastGeneratedPeriod(), schedule.getNotes(),
				schedule.getCreatedAt(), schedule.getUpdatedAt());
	}

	private RecurringInvoiceRes toInvoiceRes(Invoice invoice, LocalDate asOf) {
		YearMonth period = YearMonth.from(asOf);
		return new RecurringInvoiceRes(invoice.getId(), invoice.getInvoiceCode(), invoice.getContractId(),
				invoice.getCustomerId(), period.atDay(1), period.atEndOfMonth(), invoice.getInvoiceDate(),
				invoice.getTotalAmount(), invoice.getStatus().name());
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
