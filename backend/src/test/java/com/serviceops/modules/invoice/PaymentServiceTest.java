package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.invoice.dto.request.PaymentCreateReq;
import com.serviceops.modules.invoice.dto.response.PaymentRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.Payment;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.enums.PaymentMethod;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.PaymentRepository;
import com.serviceops.modules.invoice.service.impl.PaymentServiceImpl;
import com.serviceops.modules.invoice.validator.PaymentAmountValidator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Nghiep vu ghi nhan thanh toan cua khach hang (NCL-10-CN-003): TC-01 thu du -> PAID,
 * TC-02 thu mot phan -> PARTIALLY_PAID, TC-03 chan khi vuot so con phai thu, TC-05 ghi
 * Nhat ky he thong. TC-04 (vai tro) nam o {@link PaymentControllerTest}.
 */
@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 9, 21);

	@Mock
	private InvoiceRepository invoiceRepository;
	@Mock
	private PaymentRepository paymentRepository;
	@Mock
	private AuditLogService auditLogService;

	private PaymentServiceImpl service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-21T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		service = new PaymentServiceImpl(invoiceRepository, paymentRepository, new PaymentAmountValidator(),
				auditLogService, clock);
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken("ketoan01", "x"));
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void fullPaymentMarksInvoicePaid() {
		stubInvoice(InvoiceStatus.ISSUED, "100000000.00", "0");
		stubSave();

		PaymentRes res = service.recordPayment(9L, request("100000000", TODAY));

		assertThat(res.invoiceStatus()).isEqualTo("PAID");
		assertThat(res.paidAmount()).isEqualByComparingTo("100000000.00");
		assertThat(res.remainingAmount()).isEqualByComparingTo("0");
		assertThat(res.totalAmount()).isEqualByComparingTo("100000000.00");
		assertThat(res.method()).isEqualTo("BANK_TRANSFER");
		assertThat(res.createdBy()).isEqualTo("ketoan01");
		ArgumentCaptor<Invoice> invoice = ArgumentCaptor.forClass(Invoice.class);
		verify(invoiceRepository).save(invoice.capture());
		assertThat(invoice.getValue().getStatus()).isEqualTo(InvoiceStatus.PAID);
	}

	@Test
	void partialPaymentMarksInvoicePartiallyPaidAndReportsRemainingDebt() {
		stubInvoice(InvoiceStatus.ISSUED, "100000000.00", "0");
		stubSave();

		PaymentRes res = service.recordPayment(9L, request("60000000", TODAY));

		assertThat(res.invoiceStatus()).isEqualTo("PARTIALLY_PAID");
		assertThat(res.paidAmount()).isEqualByComparingTo("60000000.00");
		assertThat(res.remainingAmount()).isEqualByComparingTo("40000000.00");
	}

	@Test
	void secondPaymentThatClearsTheDebtMarksInvoicePaid() {
		stubInvoice(InvoiceStatus.PARTIALLY_PAID, "100000000.00", "60000000.00");
		stubSave();

		PaymentRes res = service.recordPayment(9L, request("40000000", TODAY));

		assertThat(res.invoiceStatus()).isEqualTo("PAID");
		assertThat(res.paidAmount()).isEqualByComparingTo("100000000.00");
		assertThat(res.remainingAmount()).isEqualByComparingTo("0");
	}

	@Test
	void blocksAmountGreaterThanRemainingDebtAndSavesNothing() {
		stubInvoice(InvoiceStatus.PARTIALLY_PAID, "100000000.00", "60000000.00");

		assertThatThrownBy(() -> service.recordPayment(9L, request("40000000.01", TODAY)))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
					assertThat(ex.getMessage()).contains("con phai thu");
				});

		assertNothingWritten();
	}

	@Test
	void rejectsFuturePaymentDateButAllowsToday() {
		stubInvoice(InvoiceStatus.ISSUED, "100000000.00", "0");

		assertThatThrownBy(() -> service.recordPayment(9L, request("10000000", TODAY.plusDays(1))))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
					assertThat(ex.getMessage()).contains("tuong lai");
				});
		assertNothingWritten();

		stubSave();
		assertThat(service.recordPayment(9L, request("10000000", TODAY)).paymentDate()).isEqualTo(TODAY);
	}

	@Test
	void allowsPaymentDatedBeforeTheInvoiceDate() {
		stubInvoice(InvoiceStatus.ISSUED, "100000000.00", "0");
		stubSave();

		PaymentRes res = service.recordPayment(9L, request("10000000", LocalDate.of(2026, 1, 5)));

		assertThat(res.paymentDate()).isEqualTo(LocalDate.of(2026, 1, 5));
	}

	@Test
	void rejectsInvoicesThatCannotReceivePayment() {
		for (InvoiceStatus status : List.of(InvoiceStatus.DRAFT, InvoiceStatus.PAID, InvoiceStatus.CANCELLED)) {
			Invoice invoice = invoice(status, "100000000.00");
			when(invoiceRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(invoice));

			assertThatThrownBy(() -> service.recordPayment(9L, request("1000", TODAY)))
					.isInstanceOfSatisfying(BusinessRuleException.class,
							ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));
		}
		assertNothingWritten();
	}

	@Test
	void returnsNotFoundForUnknownInvoice() {
		when(invoiceRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.recordPayment(99L, request("1000", TODAY)))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));

		assertNothingWritten();
	}

	@Test
	void writesSystemAuditLogWithInvoiceTargetAndPaymentDetails() {
		stubInvoice(InvoiceStatus.ISSUED, "100000000.00", "0");
		stubSave();

		service.recordPayment(9L, request("60000000", TODAY));

		ArgumentCaptor<String> detail = ArgumentCaptor.forClass(String.class);
		verify(auditLogService).record(eq("Ghi nhan thanh toan cua khach hang"), eq(AuditTargetType.INVOICE),
				eq(9L), eq("INV-TEST"), detail.capture());
		assertThat(detail.getValue()).contains("60000000.00").contains("BANK_TRANSFER").contains("2026-09-21")
				.contains("con lai 40000000.00").contains("ISSUED -> PARTIALLY_PAID");
	}

	private void assertNothingWritten() {
		verify(paymentRepository, never()).save(any());
		verify(invoiceRepository, never()).save(any());
		verify(auditLogService, never()).record(anyString(), any(), any(), any(), any());
	}

	private void stubInvoice(InvoiceStatus status, String total, String alreadyPaid) {
		when(invoiceRepository.findByIdForUpdate(9L)).thenReturn(Optional.of(invoice(status, total)));
		when(paymentRepository.sumAmountByInvoiceId(9L)).thenReturn(new BigDecimal(alreadyPaid));
	}

	private void stubSave() {
		when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
			Payment saved = inv.getArgument(0);
			saved.setId(500L);
			return saved;
		});
	}

	private Invoice invoice(InvoiceStatus status, String total) {
		Invoice invoice = new Invoice();
		invoice.setId(9L);
		invoice.setInvoiceCode("INV-TEST");
		invoice.setStatus(status);
		invoice.setTotalAmount(new BigDecimal(total));
		return invoice;
	}

	private PaymentCreateReq request(String amount, LocalDate date) {
		return new PaymentCreateReq(new BigDecimal(amount), date, PaymentMethod.BANK_TRANSFER, null);
	}
}
