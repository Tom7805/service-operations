package com.serviceops.modules.invoice;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes.BucketRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.Payment;
import com.serviceops.modules.invoice.enums.AgingBucket;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.enums.PaymentMethod;
import com.serviceops.modules.invoice.service.ReceivableService;
import com.serviceops.modules.invoice.service.impl.InvoiceServiceImpl;
import com.serviceops.modules.invoice.service.impl.ReceivableServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Chay {@link ReceivableServiceImpl} tren JPA THAT (H2): truy van hoa don qua han, tong da thu theo lo va phan nhom
 * tuoi no — cac unit test mock khong thuc thi cac truy van nay. Phu TC-01 (qua han 40 ngay), TC-02 (khong co no qua
 * han) va tuong tac voi ghi nhan thanh toan (NCL-10-CN-003): tra du thi hoa don roi khoi danh sach qua han.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({ReceivableServiceImpl.class, InvoiceServiceImpl.class, ReceivableIntegrationTest.ClockConfig.class})
class ReceivableIntegrationTest {

	@TestConfiguration
	static class ClockConfig {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-09-21T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}
	}

	private static final LocalDate TODAY = LocalDate.of(2026, 9, 21);
	private static final AtomicInteger UNIQUE = new AtomicInteger();

	@Autowired private TestEntityManager em;
	@Autowired private ReceivableService service;

	@Test
	@DisplayName("NCL-10-CN-004-TC-01: hoa don qua han 40 ngay xuat hien trong nhom qua han tren 30 ngay, kem khach hang va so con lai")
	void invoiceOverdueFortyDaysShowsInOverThirtyDaysBucketWithCustomerAndRemaining() {
		Contract contract = contract("Cong ty ABC");
		Invoice invoice = invoice(contract, "INV-A", InvoiceStatus.PARTIALLY_PAID, "100000000.00",
				TODAY.minusDays(40));
		pay(invoice, "30000000.00");
		em.flush();

		ReceivableAgingRes res = service.getOverdue(null, null);

		assertThat(res.totalInvoiceCount()).isEqualTo(1);
		assertThat(res.totalRemainingAmount()).isEqualByComparingTo("70000000.00");
		BucketRes bucket = bucket(res, AgingBucket.DAYS_31_60);
		assertThat(bucket.invoices()).singleElement().satisfies(item -> {
			assertThat(item.invoiceCode()).isEqualTo("INV-A");
			assertThat(item.customerName()).isEqualTo("Cong ty ABC");
			assertThat(item.contractCode()).isEqualTo(contract.getContractCode());
			assertThat(item.daysOverdue()).isEqualTo(40);
			assertThat(item.paidAmount()).isEqualByComparingTo("30000000.00");
			assertThat(item.remainingAmount()).isEqualByComparingTo("70000000.00");
		});
	}

	@Test
	@DisplayName("NCL-10-CN-004-TC-02: khong co hoa don nao qua han -> khong co dong nao trong bon nhom")
	void noOverdueInvoicesLeavesAllBucketsEmpty() {
		Contract contract = contract("Cong ty ABC");
		invoice(contract, "INV-A", InvoiceStatus.ISSUED, "100.00", TODAY.plusDays(5));
		invoice(contract, "INV-B", InvoiceStatus.ISSUED, "100.00", TODAY);
		em.flush();

		ReceivableAgingRes res = service.getOverdue(null, null);

		assertThat(res.totalInvoiceCount()).isZero();
		assertThat(res.buckets()).hasSize(4).allSatisfy(b -> assertThat(b.invoices()).isEmpty());
	}

	@Test
	@DisplayName("Hoa don da tra du, da huy hoac con nhap khong bi tinh la cong no qua han")
	void paidCancelledAndDraftInvoicesAreNotReceivables() {
		Contract contract = contract("Cong ty ABC");
		Invoice paid = invoice(contract, "INV-PAID", InvoiceStatus.PAID, "100.00", TODAY.minusDays(50));
		pay(paid, "100.00");
		invoice(contract, "INV-CANCELLED", InvoiceStatus.CANCELLED, "100.00", TODAY.minusDays(50));
		invoice(contract, "INV-DRAFT", InvoiceStatus.DRAFT, "100.00", TODAY.minusDays(50));
		invoice(contract, "INV-OPEN", InvoiceStatus.ISSUED, "100.00", TODAY.minusDays(50));
		em.flush();

		ReceivableAgingRes res = service.getOverdue(null, null);

		assertThat(res.buckets().stream().flatMap(b -> b.invoices().stream()).map(i -> i.invoiceCode()).toList())
				.containsExactly("INV-OPEN");
	}

	@Test
	@DisplayName("Ghi nhan thanh toan du (NCL-10-CN-003) lam hoa don roi khoi danh sach qua han")
	void invoiceLeavesTheOverdueListOncePaidInFull() {
		Contract contract = contract("Cong ty ABC");
		Invoice invoice = invoice(contract, "INV-A", InvoiceStatus.ISSUED, "100.00", TODAY.minusDays(10));
		em.flush();
		assertThat(service.getOverdue(null, null).totalInvoiceCount()).isEqualTo(1);

		pay(invoice, "100.00");
		invoice.setStatus(InvoiceStatus.PAID);
		em.flush();
		em.clear();

		assertThat(service.getOverdue(null, null).totalInvoiceCount()).isZero();
	}

	@Test
	void groupsAcrossBucketsAndFiltersByCustomerAndBucket() {
		Contract abc = contract("Cong ty ABC");
		Contract xyz = contract("Cong ty XYZ");
		invoice(abc, "INV-1", InvoiceStatus.ISSUED, "100.00", TODAY.minusDays(3));
		invoice(abc, "INV-2", InvoiceStatus.ISSUED, "200.00", TODAY.minusDays(75));
		invoice(xyz, "INV-3", InvoiceStatus.ISSUED, "400.00", TODAY.minusDays(120));
		em.flush();

		ReceivableAgingRes all = service.getOverdue(null, null);
		ReceivableAgingRes onlyAbc = service.getOverdue(abc.getCustomerId(), null);
		ReceivableAgingRes onlyOver90 = service.getOverdue(null, AgingBucket.OVER_90);

		assertThat(bucket(all, AgingBucket.DAYS_1_30).invoiceCount()).isEqualTo(1);
		assertThat(bucket(all, AgingBucket.DAYS_61_90).remainingAmount()).isEqualByComparingTo("200.00");
		assertThat(bucket(all, AgingBucket.OVER_90).remainingAmount()).isEqualByComparingTo("400.00");
		assertThat(all.totalRemainingAmount()).isEqualByComparingTo("700.00");
		assertThat(onlyAbc.totalInvoiceCount()).isEqualTo(2);
		assertThat(onlyAbc.totalRemainingAmount()).isEqualByComparingTo("300.00");
		assertThat(onlyOver90.totalInvoiceCount()).isEqualTo(1);
		assertThat(onlyOver90.totalRemainingAmount()).isEqualByComparingTo("400.00");
	}

	// ---------- du lieu ----------

	private BucketRes bucket(ReceivableAgingRes res, AgingBucket bucket) {
		List<BucketRes> buckets = res.buckets();
		return buckets.stream().filter(b -> b.bucket().equals(bucket.name())).findFirst().orElseThrow();
	}

	private Contract contract(String customerName) {
		int n = UNIQUE.incrementAndGet();
		LocalDateTime now = LocalDateTime.of(2026, 1, 1, 8, 0);
		Customer customer = new Customer();
		customer.setCode("KHR" + n);
		customer.setName(customerName);
		customer.setCreatedAt(now);
		em.persist(customer);
		Contract contract = new Contract();
		contract.setContractCode("HDR" + n);
		contract.setName("Hop dong " + n);
		contract.setCustomerId(customer.getId());
		contract.setContractType(ContractType.FIXED_PRICE);
		contract.setTotalValue(new BigDecimal("1000000000.00"));
		contract.setCreatedAt(now);
		em.persist(contract);
		return contract;
	}

	private Invoice invoice(Contract contract, String code, InvoiceStatus status, String total, LocalDate dueDate) {
		LocalDateTime now = LocalDateTime.of(2026, 1, 1, 8, 0);
		Invoice invoice = new Invoice();
		invoice.setInvoiceCode(code);
		invoice.setContractId(contract.getId());
		invoice.setCustomerId(contract.getCustomerId());
		invoice.setStatus(status);
		invoice.setTotalAmount(new BigDecimal(total));
		invoice.setInvoiceDate(dueDate.minusDays(30));
		invoice.setDueDate(dueDate);
		invoice.setCreatedAt(now);
		invoice.setUpdatedAt(now);
		em.persist(invoice);
		return invoice;
	}

	private void pay(Invoice invoice, String amount) {
		Payment payment = new Payment();
		payment.setInvoiceId(invoice.getId());
		payment.setAmount(new BigDecimal(amount));
		payment.setPaymentDate(TODAY.minusDays(1));
		payment.setMethod(PaymentMethod.BANK_TRANSFER);
		payment.setCreatedAt(LocalDateTime.of(2026, 9, 20, 9, 0));
		em.persist(payment);
	}
}
