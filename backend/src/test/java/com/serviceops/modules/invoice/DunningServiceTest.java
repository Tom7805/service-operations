package com.serviceops.modules.invoice;

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
import com.serviceops.modules.invoice.service.InvoiceService;
import com.serviceops.modules.invoice.service.impl.DunningServiceImpl;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** NCL-10-CN-006: nhac thu no tu dong (QTN-27). */
@ExtendWith(MockitoExtension.class)
class DunningServiceTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 9, 21);

	@Mock
	private InvoiceService invoiceService;
	@Mock
	private InvoiceRepository invoiceRepository;
	@Mock
	private CustomerRepository customerRepository;
	@Mock
	private UserRoleScopeRepository userRoleScopeRepository;
	@Mock
	private DunningLogRepository dunningLogRepository;
	@Mock
	private NotificationService notificationService;
	@Mock
	private AuditLogService auditLogService;

	private DunningServiceImpl service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-21T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		service = new DunningServiceImpl(invoiceService, invoiceRepository, customerRepository,
				userRoleScopeRepository, dunningLogRepository, notificationService, auditLogService, clock);
	}

	private InvoiceDetailRes invoice(Long id, LocalDate dueDate, String remaining) {
		return new InvoiceDetailRes(id, "INV-" + id, 1L, "HD-0001", 100L, "Cong ty A", "ISSUED",
				new BigDecimal("100000000.00"), new BigDecimal("0.00"), new BigDecimal(remaining),
				dueDate.minusDays(10), dueDate, null, "ketoan1", LocalDateTime.now());
	}

	private void stubCommonRecipients() {
		when(userRoleScopeRepository.findUserIdsByRoleCode("VT-05")).thenReturn(List.of(1L, 2L));
		Customer customer = new Customer();
		customer.setId(100L);
		customer.setOwnerId(3L);
		when(customerRepository.findById(100L)).thenReturn(Optional.of(customer));
	}

	// TC-01: con dung 3 ngay la toi han -> nhac Ke toan + nguoi phu trach khach hang.
	@Test
	@DisplayName("NCL-10-CN-006-TC-01: hoa don con 3 ngay toi han -> gui nhac va ghi lich su")
	void sendsUpcomingReminderThreeDaysBeforeDue() {
		stubCommonRecipients();
		InvoiceDetailRes inv = invoice(9L, TODAY.plusDays(3), "40000000.00");
		when(invoiceService.list(null, EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)))
				.thenReturn(List.of(inv));
		when(dunningLogRepository.existsByInvoiceIdAndStageAndReferenceDate(9L, DunningStage.UPCOMING_3_DAYS,
				TODAY.plusDays(3))).thenReturn(false);
		when(dunningLogRepository.save(any(DunningLog.class))).thenAnswer(invocation -> {
			DunningLog log = invocation.getArgument(0);
			log.setId(500L);
			return log;
		});

		DunningRunRes result = service.run(new DunningRunReq(null));

		assertThat(result.sent()).hasSize(1);
		assertThat(result.skippedAlreadySentCount()).isZero();
		DunningLogRes logRes = result.sent().get(0);
		assertThat(logRes.stage()).isEqualTo("UPCOMING_3_DAYS");
		assertThat(logRes.invoiceId()).isEqualTo(9L);
		assertThat(logRes.remainingAmount()).isEqualByComparingTo("40000000.00");
		assertThat(logRes.recipientIds()).containsExactlyInAnyOrder(1L, 2L, 3L);

		verify(notificationService, times(3)).sendInAppNotification(anyLong(),
				eq(NotificationType.DUNNING_REMINDER), any(), any(), eq(9L), any());
		verify(auditLogService).record(eq("Nhắc thu nợ tự động"), eq(AuditTargetType.INVOICE), eq((Long) null),
				any(), any());
	}

	@Test
	@DisplayName("NCL-10-CN-006: hoa don dung han hom nay -> stage DUE_TODAY")
	void sendsDueTodayReminder() {
		stubCommonRecipients();
		InvoiceDetailRes inv = invoice(10L, TODAY, "5000000.00");
		when(invoiceService.list(null, EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)))
				.thenReturn(List.of(inv));
		when(dunningLogRepository.save(any(DunningLog.class))).thenAnswer(invocation -> {
			DunningLog log = invocation.getArgument(0);
			log.setId(501L);
			return log;
		});

		DunningRunRes result = service.run(new DunningRunReq(null));

		assertThat(result.sent()).hasSize(1);
		assertThat(result.sent().get(0).stage()).isEqualTo("DUE_TODAY");
		assertThat(result.sent().get(0).daysOverdue()).isZero();
	}

	@Test
	@DisplayName("NCL-10-CN-006: qua han dung boi so 7 ngay -> stage OVERDUE")
	void sendsOverdueReminderOnSevenDayCycle() {
		stubCommonRecipients();
		InvoiceDetailRes inv = invoice(11L, TODAY.minusDays(7), "2000000.00");
		when(invoiceService.list(null, EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)))
				.thenReturn(List.of(inv));
		when(dunningLogRepository.save(any(DunningLog.class))).thenAnswer(invocation -> {
			DunningLog log = invocation.getArgument(0);
			log.setId(502L);
			return log;
		});

		DunningRunRes result = service.run(new DunningRunReq(null));

		assertThat(result.sent()).hasSize(1);
		assertThat(result.sent().get(0).stage()).isEqualTo("OVERDUE");
		assertThat(result.sent().get(0).daysOverdue()).isEqualTo(7);
	}

	@Test
	@DisplayName("NCL-10-CN-006: qua han nhung chua dung chu ky 7 ngay -> khong nhac")
	void doesNotRemindWhenOverdueDaysIsNotOnCycle() {
		InvoiceDetailRes inv = invoice(12L, TODAY.minusDays(10), "2000000.00");
		when(invoiceService.list(null, EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)))
				.thenReturn(List.of(inv));

		DunningRunRes result = service.run(new DunningRunReq(null));

		assertThat(result.sent()).isEmpty();
		assertThat(result.skippedAlreadySentCount()).isZero();
		verify(dunningLogRepository, never()).save(any());
		verify(notificationService, never()).sendInAppNotification(anyLong(), any(), any(), any(), any(), any());
	}

	// TC-02: da nhac roi trong cung ngay -> khong gui lai.
	@Test
	@DisplayName("NCL-10-CN-006-TC-02: moc da duoc nhac roi -> khong gui lai va tang so bo qua")
	void doesNotResendAlreadySentMilestone() {
		InvoiceDetailRes inv = invoice(13L, TODAY, "5000000.00");
		when(invoiceService.list(null, EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)))
				.thenReturn(List.of(inv));
		when(dunningLogRepository.existsByInvoiceIdAndStageAndReferenceDate(13L, DunningStage.DUE_TODAY, TODAY))
				.thenReturn(true);

		DunningRunRes result = service.run(new DunningRunReq(null));

		assertThat(result.sent()).isEmpty();
		assertThat(result.skippedAlreadySentCount()).isEqualTo(1);
		verify(dunningLogRepository, never()).save(any());
		verify(notificationService, never()).sendInAppNotification(anyLong(), any(), any(), any(), any(), any());
	}

	@Test
	@DisplayName("QTN-27: chay trung luc voi lan khac (exists-check qua nhung save() vi pham UNIQUE) -> bo qua, khong lam hong ca luot chay")
	void treatsConcurrentDuplicateInsertAsAlreadySentInsteadOfFailingTheWholeRun() {
		stubCommonRecipients();
		InvoiceDetailRes first = invoice(20L, TODAY, "1000000.00");
		InvoiceDetailRes second = invoice(21L, TODAY, "2000000.00");
		when(invoiceService.list(null, EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)))
				.thenReturn(List.of(first, second));
		when(dunningLogRepository.existsByInvoiceIdAndStageAndReferenceDate(any(), eq(DunningStage.DUE_TODAY),
				eq(TODAY))).thenReturn(false);
		when(dunningLogRepository.save(any()))
				.thenThrow(new org.springframework.dao.DataIntegrityViolationException("uq_dunning_logs_cycle"))
				.thenAnswer(invocation -> invocation.getArgument(0));

		DunningRunRes result = service.run(new DunningRunReq(null));

		assertThat(result.skippedAlreadySentCount()).isEqualTo(1);
		assertThat(result.sent()).hasSize(1);
		assertThat(result.sent().get(0).invoiceId()).isEqualTo(21L);
	}

	@Test
	@DisplayName("Hoa don khong o moc nao ca ba stage -> bi bo qua hoan toan, khong tinh vao skipped")
	void ignoresInvoicesNotAtAnyMilestone() {
		InvoiceDetailRes inv = invoice(14L, TODAY.plusDays(10), "5000000.00");
		when(invoiceService.list(null, EnumSet.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)))
				.thenReturn(List.of(inv));

		DunningRunRes result = service.run(new DunningRunReq(null));

		assertThat(result.sent()).isEmpty();
		assertThat(result.skippedAlreadySentCount()).isZero();
	}

	@Test
	void historyReturnsLogsForExistingInvoice() {
		when(invoiceRepository.existsById(9L)).thenReturn(true);
		DunningLog log = new DunningLog();
		log.setId(1L);
		log.setInvoiceId(9L);
		log.setStage(DunningStage.DUE_TODAY);
		log.setReferenceDate(TODAY);
		log.setDaysOverdue(0);
		log.setRemainingAmount(new BigDecimal("1000.00"));
		log.setRecipientIds("1,2,3");
		log.setSentAt(LocalDateTime.now());
		when(dunningLogRepository.findByInvoiceIdOrderBySentAtDesc(9L)).thenReturn(List.of(log));

		List<DunningLogRes> history = service.history(9L);

		assertThat(history).hasSize(1);
		assertThat(history.get(0).recipientIds()).containsExactly(1L, 2L, 3L);
	}

	@Test
	void historyThrowsWhenInvoiceMissing() {
		when(invoiceRepository.existsById(99L)).thenReturn(false);

		assertThatThrownBy(() -> service.history(99L))
				.isInstanceOf(BusinessRuleException.class)
				.satisfies(ex -> assertThat(((BusinessRuleException) ex).getErrorCode())
						.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
	}
}
