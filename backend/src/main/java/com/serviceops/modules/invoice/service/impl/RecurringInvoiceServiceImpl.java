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
import com.serviceops.modules.invoice.enums.InvoiceSource;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.RecurringInvoiceScheduleRepository;
import com.serviceops.modules.invoice.service.RecurringInvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * NCL-10-CN-005: hoa don dinh ky cho hop dong duy tri (QTN-19).
 *
 * <p>Quy tac chinh:</p>
 * <ul>
 *   <li>Chi hop dong loai {@link ContractType#MAINTENANCE} moi khai bao duoc dieu khoan dinh
 *       ky, moi hop dong toi da mot dieu khoan dang hieu luc.</li>
 *   <li>{@link #run} ra soat toan bo dieu khoan {@code active}: dieu khoan nao co
 *       {@code billingDayOfMonth} trung ngay {@code asOf} VA chua sinh cho ky nay
 *       ({@code lastGeneratedPeriod}) moi duoc xu ly (TC-01).</li>
 *   <li>Hop dong da het hieu luc (qua {@code endDate}, hoac trang thai TERMINATED/COMPLETED)
 *       tai ngay {@code asOf} thi bo qua va bao ly do de Ke toan kiem tra gia han (TC-02),
 *       khong tao hoa don.</li>
 *   <li>Truoc khi tao, cong don gia tri hoa don da lap voi gia tri hoa don moi va so sanh voi
 *       han muc/gia tri hop dong (QTN-19) — vuot han muc thi bo qua kem ly do thay vi chan ca
 *       lan chay.</li>
 *   <li>TC-04: moi lan tao hoa don hoac thay doi dieu khoan deu ghi Nhat ky he thong.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RecurringInvoiceServiceImpl implements RecurringInvoiceService {

	private static final DateTimeFormatter PERIOD_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

	private final RecurringInvoiceScheduleRepository scheduleRepository;
	private final InvoiceRepository invoiceRepository;
	private final ContractRepository contractRepository;
	private final AuditLogService auditLogService;
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
		schedule.setCurrency(request.currency() == null || request.currency().isBlank() ? "VND" : request.currency());
		schedule.setActive(request.active() == null || request.active());
		schedule.setNotes(request.notes());
		schedule.setCreatedBy(currentUsername());
		schedule.setCreatedAt(now);
		RecurringInvoiceSchedule saved = scheduleRepository.save(schedule);

		auditLogService.record("Khai báo hóa đơn định kỳ", AuditTargetType.INVOICE, saved.getId(),
				"Hóa đơn định kỳ cho hợp đồng duy trì",
				"Hợp đồng " + contract.getContractCode() + ": lập ngày " + saved.getBillingDayOfMonth()
						+ " hằng tháng, giá trị " + saved.getAmount().toPlainString() + " " + saved.getCurrency());

		return toRes(saved);
	}

	@Override
	public RecurringScheduleRes updateSchedule(Long contractId, RecurringScheduleReq request) {
		RecurringInvoiceSchedule schedule = requireSchedule(contractId);
		Contract contract = requireContract(contractId);

		schedule.setBillingDayOfMonth(request.billingDayOfMonth());
		schedule.setAmount(request.amount());
		if (request.currency() != null && !request.currency().isBlank()) {
			schedule.setCurrency(request.currency());
		}
		if (request.active() != null) {
			schedule.setActive(request.active());
		}
		schedule.setNotes(request.notes());
		schedule.setUpdatedAt(LocalDateTime.now(clock));
		RecurringInvoiceSchedule saved = scheduleRepository.save(schedule);

		auditLogService.record("Cập nhật hóa đơn định kỳ", AuditTargetType.INVOICE, saved.getId(),
				"Hóa đơn định kỳ cho hợp đồng duy trì",
				"Hợp đồng " + contract.getContractCode() + ": lập ngày " + saved.getBillingDayOfMonth()
						+ " hằng tháng, giá trị " + saved.getAmount().toPlainString() + " " + saved.getCurrency()
						+ (Boolean.FALSE.equals(saved.getActive()) ? " (đã tắt)" : ""));

		return toRes(saved);
	}

	@Override
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

			Contract contract = contractRepository.findById(schedule.getContractId()).orElse(null);
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

			BigDecimal cap = contract.getLimitValue() != null ? contract.getLimitValue() : contract.getTotalValue();
			BigDecimal alreadyInvoiced = invoiceRepository.sumAmountByContractId(contract.getId());
			if (cap != null && alreadyInvoiced.add(schedule.getAmount()).compareTo(cap) > 0) {
				skipped.add(new RecurringInvoiceSkipRes(contract.getId(),
						"Vượt giá trị hợp đồng " + contract.getContractCode()
								+ " (đã lập " + alreadyInvoiced.toPlainString() + "/" + cap.toPlainString()
								+ "), cần lập phụ lục điều chỉnh trước khi lập thêm hóa đơn"));
				continue;
			}

			Invoice invoice = generateInvoice(contract, schedule, asOf);
			schedule.setLastGeneratedPeriod(currentPeriod);
			schedule.setUpdatedAt(LocalDateTime.now(clock));
			scheduleRepository.save(schedule);

			auditLogService.record("Lập hóa đơn định kỳ", AuditTargetType.INVOICE, invoice.getId(),
					"Hóa đơn định kỳ cho hợp đồng duy trì",
					"Hợp đồng " + contract.getContractCode() + ": hóa đơn " + invoice.getInvoiceNumber()
							+ " kỳ " + currentPeriod + ", giá trị " + invoice.getAmount().toPlainString()
							+ " " + invoice.getCurrency());

			created.add(toInvoiceRes(invoice));
		}

		return new RecurringInvoiceRunRes(asOf, created, skipped);
	}

	private Invoice generateInvoice(Contract contract, RecurringInvoiceSchedule schedule, LocalDate asOf) {
		YearMonth period = YearMonth.from(asOf);
		LocalDateTime now = LocalDateTime.now(clock);

		Invoice invoice = new Invoice();
		invoice.setInvoiceNumber(nextInvoiceNumber(asOf));
		invoice.setContractId(contract.getId());
		invoice.setCustomerId(contract.getCustomerId());
		invoice.setSource(InvoiceSource.RECURRING);
		invoice.setPeriodStart(period.atDay(1));
		invoice.setPeriodEnd(period.atEndOfMonth());
		invoice.setIssueDate(asOf);
		invoice.setDueDate(asOf.plusDays(15));
		invoice.setAmount(schedule.getAmount());
		invoice.setCurrency(schedule.getCurrency());
		invoice.setStatus(InvoiceStatus.DRAFT);
		invoice.setNotes("Hóa đơn định kỳ kỳ " + period.format(PERIOD_FORMAT));
		invoice.setCreatedBy(currentUsername());
		invoice.setCreatedAt(now);
		return invoiceRepository.save(invoice);
	}

	private String nextInvoiceNumber(LocalDate asOf) {
		String prefix = "HD-" + YearMonth.from(asOf).format(PERIOD_FORMAT).replace("-", "") + "-";
		long sequence = invoiceRepository.countByInvoiceNumberStartingWith(prefix) + 1;
		return prefix + String.format("%04d", sequence);
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
				schedule.getAmount(), schedule.getCurrency(), schedule.getActive(), schedule.getLastGeneratedPeriod(),
				schedule.getNotes(), schedule.getCreatedAt(), schedule.getUpdatedAt());
	}

	private RecurringInvoiceRes toInvoiceRes(Invoice invoice) {
		return new RecurringInvoiceRes(invoice.getId(), invoice.getInvoiceNumber(), invoice.getContractId(),
				invoice.getCustomerId(), invoice.getPeriodStart(), invoice.getPeriodEnd(), invoice.getIssueDate(),
				invoice.getAmount(), invoice.getCurrency(), invoice.getStatus().name());
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
