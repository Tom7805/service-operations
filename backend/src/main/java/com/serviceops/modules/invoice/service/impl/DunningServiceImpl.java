package com.serviceops.modules.invoice.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.invoice.dto.request.DunningRunReq;
import com.serviceops.modules.invoice.dto.response.DunningLogRes;
import com.serviceops.modules.invoice.dto.response.DunningRunRes;
import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.entity.DunningLog;
import com.serviceops.modules.invoice.enums.DunningStage;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.DunningLogRepository;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.service.DunningService;
import com.serviceops.modules.invoice.service.InvoiceService;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * NCL-10-CN-006: nhắc thu nợ tự động (QTN-27).
 *
 * <p>Ba mốc nhắc cho mỗi hóa đơn còn công nợ (trạng thái {@code ISSUED}/{@code PARTIALLY_PAID}, còn
 * phải thu &gt; 0):</p>
 * <ul>
 *   <li><b>Trước hạn 3 ngày</b> ({@link DunningStage#UPCOMING_3_DAYS}): {@code dueDate == asOf + 3}.</li>
 *   <li><b>Đúng hạn</b> ({@link DunningStage#DUE_TODAY}): {@code dueDate == asOf}.</li>
 *   <li><b>Sau hạn theo chu kỳ 7 ngày</b> ({@link DunningStage#OVERDUE}): {@code daysOverdue} là bội
 *       số dương của 7 (7, 14, 21…) — lặp lại đều đặn cho tới khi hóa đơn được thanh toán đủ.</li>
 * </ul>
 * <p>Mỗi mốc (hóa đơn + stage + ngày tham chiếu) chỉ gửi đúng một lần: {@link DunningLogRepository}
 * kiểm tra trước khi gửi (TC-02), ràng buộc UNIQUE ở DB là chốt chặn cuối. Người nhận là toàn bộ Kế
 * toán (vai trò {@code VT-05}) và người phụ trách khách hàng của hóa đơn ({@code Customer.ownerId}),
 * không trùng lặp.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class DunningServiceImpl implements DunningService {

	private static final String ACCOUNTANT_ROLE_CODE = "VT-05";
	private static final int UPCOMING_DAYS_BEFORE_DUE = 3;
	private static final int OVERDUE_CYCLE_DAYS = 7;

	private final InvoiceService invoiceService;
	private final InvoiceRepository invoiceRepository;
	private final CustomerRepository customerRepository;
	private final UserRoleScopeRepository userRoleScopeRepository;
	private final DunningLogRepository dunningLogRepository;
	private final NotificationService notificationService;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public DunningRunRes run(DunningRunReq request) {
		LocalDate asOf = request != null && request.asOf() != null ? request.asOf() : LocalDate.now(clock);

		List<InvoiceDetailRes> outstanding = invoiceService
				.list(null, EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)).stream()
				.filter(invoice -> invoice.remainingAmount().signum() > 0)
				.toList();

		List<DunningLogRes> sent = new ArrayList<>();
		int skipped = 0;
		for (InvoiceDetailRes invoice : outstanding) {
			Plan plan = planFor(invoice, asOf);
			if (plan == null) {
				continue; // Chua toi moc nao can nhac trong lan ra soat nay.
			}
			if (dunningLogRepository.existsByInvoiceIdAndStageAndReferenceDate(
					invoice.id(), plan.stage(), plan.referenceDate())) {
				skipped++; // TC-02: moc nay da nhac roi (chay lai trong cung ngay khong gui lai).
				continue;
			}

			DunningLogRes logRes = sendReminder(invoice, plan, asOf);
			sent.add(logRes);
		}

		if (!sent.isEmpty()) {
			auditLogService.record("Nhắc thu nợ tự động", AuditTargetType.INVOICE, null,
					"Nhắc thu nợ tự động",
					"Rà soát ngày " + asOf + ": đã nhắc " + sent.size() + " hóa đơn, bỏ qua " + skipped
							+ " hóa đơn đã nhắc trước đó");
		}

		return new DunningRunRes(asOf, sent, skipped);
	}

	@Override
	@Transactional(readOnly = true)
	public List<DunningLogRes> history(Long invoiceId) {
		if (!invoiceRepository.existsById(invoiceId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay hoa don voi id=" + invoiceId);
		}
		return dunningLogRepository.findByInvoiceIdOrderBySentAtDesc(invoiceId).stream()
				.map(DunningServiceImpl::toRes)
				.toList();
	}

	/** Xac dinh moc can nhac (neu co) cho mot hoa don tai ngay ra soat; null = chua toi moc nao. */
	private Plan planFor(InvoiceDetailRes invoice, LocalDate asOf) {
		LocalDate dueDate = invoice.dueDate();
		if (dueDate.equals(asOf.plusDays(UPCOMING_DAYS_BEFORE_DUE))) {
			return new Plan(DunningStage.UPCOMING_3_DAYS, dueDate, null);
		}
		if (dueDate.equals(asOf)) {
			return new Plan(DunningStage.DUE_TODAY, dueDate, 0);
		}
		if (asOf.isAfter(dueDate)) {
			long daysOverdue = ChronoUnit.DAYS.between(dueDate, asOf);
			if (daysOverdue > 0 && daysOverdue % OVERDUE_CYCLE_DAYS == 0) {
				return new Plan(DunningStage.OVERDUE, dueDate.plusDays(daysOverdue), (int) daysOverdue);
			}
		}
		return null;
	}

	private DunningLogRes sendReminder(InvoiceDetailRes invoice, Plan plan, LocalDate asOf) {
		Set<Long> recipients = recipientsFor(invoice.customerId());

		LocalDateTime now = LocalDateTime.now(clock);
		DunningLog log = new DunningLog();
		log.setInvoiceId(invoice.id());
		log.setStage(plan.stage());
		log.setReferenceDate(plan.referenceDate());
		log.setDaysOverdue(plan.daysOverdue());
		log.setRemainingAmount(invoice.remainingAmount());
		log.setRecipientIds(recipients.stream().map(String::valueOf).collect(Collectors.joining(",")));
		log.setSentAt(now);
		DunningLog saved = dunningLogRepository.save(log);

		String title = titleFor(plan.stage());
		String content = contentFor(invoice, plan);
		String referenceType = "Dunning:" + invoice.id() + ":" + plan.stage() + ":" + plan.referenceDate();
		for (Long recipientId : recipients) {
			notificationService.sendInAppNotification(recipientId, NotificationType.DUNNING_REMINDER, title, content,
					invoice.id(), referenceType);
		}

		return toRes(saved);
	}

	/** Toan bo Ke toan (VT-05) cong nguoi phu trach khach hang cua hoa don (Customer.ownerId), khong trung. */
	private Set<Long> recipientsFor(Long customerId) {
		Set<Long> recipients = new LinkedHashSet<>(userRoleScopeRepository.findUserIdsByRoleCode(ACCOUNTANT_ROLE_CODE));
		customerRepository.findById(customerId).map(Customer::getOwnerId).ifPresent(recipients::add);
		return recipients;
	}

	private static String titleFor(DunningStage stage) {
		return switch (stage) {
			case UPCOMING_3_DAYS -> "Hóa đơn sắp tới hạn thanh toán";
			case DUE_TODAY -> "Hóa đơn tới hạn thanh toán hôm nay";
			case OVERDUE -> "Hóa đơn đã quá hạn thanh toán";
		};
	}

	private static String contentFor(InvoiceDetailRes invoice, Plan plan) {
		String amount = invoice.remainingAmount().toPlainString();
		return switch (plan.stage()) {
			case UPCOMING_3_DAYS -> "Hóa đơn " + invoice.invoiceCode() + " còn " + UPCOMING_DAYS_BEFORE_DUE
					+ " ngày là tới hạn thanh toán (" + invoice.dueDate() + "), còn phải thu " + amount + ".";
			case DUE_TODAY -> "Hóa đơn " + invoice.invoiceCode() + " tới hạn thanh toán hôm nay ("
					+ invoice.dueDate() + "), còn phải thu " + amount + ".";
			case OVERDUE -> "Hóa đơn " + invoice.invoiceCode() + " đã quá hạn thanh toán " + plan.daysOverdue()
					+ " ngày (hạn " + invoice.dueDate() + "), còn phải thu " + amount + ".";
		};
	}

	private static DunningLogRes toRes(DunningLog log) {
		List<Long> recipientIds = log.getRecipientIds().isBlank() ? List.of()
				: List.of(log.getRecipientIds().split(",")).stream().map(Long::parseLong).toList();
		return new DunningLogRes(log.getId(), log.getInvoiceId(), log.getStage().name(), log.getReferenceDate(),
				log.getDaysOverdue(), log.getRemainingAmount(), recipientIds, log.getSentAt());
	}

	private record Plan(DunningStage stage, LocalDate referenceDate, Integer daysOverdue) {
	}
}
