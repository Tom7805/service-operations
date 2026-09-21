package com.serviceops.modules.invoice;

import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.Payment;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.enums.PaymentMethod;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.PaymentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Chay that cac truy van JPQL cua module hoa don tren H2 (NCL-10-CN-002/003). Cac truy van
 * {@code @Query} chi bi kiem tra cu phap khi khoi dong ung dung, nen test service voi mock
 * khong bat duoc loi o day.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
class InvoiceRepositoryTest {

	@Autowired
	private InvoiceRepository invoiceRepository;

	@Autowired
	private PaymentRepository paymentRepository;

	@Test
	void searchFiltersByContractAndStatusNewestFirst() {
		Invoice issued = save(1L, "INV-A", InvoiceStatus.ISSUED, "100.00");
		Invoice partial = save(1L, "INV-B", InvoiceStatus.PARTIALLY_PAID, "200.00");
		save(1L, "INV-C", InvoiceStatus.PAID, "300.00");
		save(2L, "INV-D", InvoiceStatus.ISSUED, "400.00");

		List<Invoice> payable = invoiceRepository.search(1L,
				List.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID));
		List<Invoice> allOfContract2 = invoiceRepository.search(2L, EnumSet.allOf(InvoiceStatus.class));
		List<Invoice> everything = invoiceRepository.search(null, EnumSet.allOf(InvoiceStatus.class));

		assertThat(payable).extracting(Invoice::getInvoiceCode).containsExactly("INV-B", "INV-A");
		assertThat(payable).extracting(Invoice::getId).containsExactly(partial.getId(), issued.getId());
		assertThat(allOfContract2).extracting(Invoice::getInvoiceCode).containsExactly("INV-D");
		assertThat(everything).hasSize(4);
	}

	@Test
	void sumsPaymentsPerInvoiceInOneQueryAndOmitsUnpaidInvoices() {
		Invoice a = save(1L, "INV-A", InvoiceStatus.PARTIALLY_PAID, "100.00");
		Invoice b = save(1L, "INV-B", InvoiceStatus.ISSUED, "100.00");
		pay(a, "30.00", LocalDate.of(2026, 9, 1));
		pay(a, "20.00", LocalDate.of(2026, 9, 2));

		List<Object[]> rows = paymentRepository.sumAmountByInvoiceIdIn(List.of(a.getId(), b.getId()));

		assertThat(rows).hasSize(1);
		assertThat((Long) rows.get(0)[0]).isEqualTo(a.getId());
		assertThat((BigDecimal) rows.get(0)[1]).isEqualByComparingTo("50.00");
		assertThat(paymentRepository.sumAmountByInvoiceId(a.getId())).isEqualByComparingTo("50.00");
		assertThat(paymentRepository.sumAmountByInvoiceId(b.getId())).isEqualByComparingTo("0");
	}

	@Test
	void paymentHistoryIsNewestPaymentDateFirst() {
		Invoice a = save(1L, "INV-A", InvoiceStatus.PARTIALLY_PAID, "100.00");
		Payment older = pay(a, "30.00", LocalDate.of(2026, 9, 1));
		Payment newer = pay(a, "20.00", LocalDate.of(2026, 9, 5));
		Payment sameDayLater = pay(a, "10.00", LocalDate.of(2026, 9, 5));

		List<Payment> history = paymentRepository.findByInvoiceIdOrderByPaymentDateDescIdDesc(a.getId());

		assertThat(history).extracting(Payment::getId)
				.containsExactly(sameDayLater.getId(), newer.getId(), older.getId());
	}

	@Test
	void locksInvoiceRowForUpdateAndSumsActiveInvoicesPerContract() {
		Invoice a = save(1L, "INV-A", InvoiceStatus.ISSUED, "100.00");
		save(1L, "INV-B", InvoiceStatus.CANCELLED, "999.00");

		assertThat(invoiceRepository.findByIdForUpdate(a.getId())).isPresent();
		assertThat(invoiceRepository.findByIdForUpdate(-1L)).isEmpty();
		assertThat(invoiceRepository.sumActiveTotalByContractId(1L)).isEqualByComparingTo("100.00");
	}

	private Invoice save(Long contractId, String code, InvoiceStatus status, String total) {
		Invoice invoice = new Invoice();
		invoice.setInvoiceCode(code);
		invoice.setContractId(contractId);
		invoice.setCustomerId(3L);
		invoice.setStatus(status);
		invoice.setTotalAmount(new BigDecimal(total));
		invoice.setInvoiceDate(LocalDate.of(2026, 9, 1));
		invoice.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		invoice.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		return invoiceRepository.saveAndFlush(invoice);
	}

	private Payment pay(Invoice invoice, String amount, LocalDate date) {
		Payment payment = new Payment();
		payment.setInvoiceId(invoice.getId());
		payment.setAmount(new BigDecimal(amount));
		payment.setPaymentDate(date);
		payment.setMethod(PaymentMethod.BANK_TRANSFER);
		payment.setCreatedAt(LocalDateTime.of(2026, 9, 1, 9, 0));
		return paymentRepository.saveAndFlush(payment);
	}
}
