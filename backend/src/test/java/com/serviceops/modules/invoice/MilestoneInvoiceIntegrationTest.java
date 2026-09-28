package com.serviceops.modules.invoice;

import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.entity.ContractMilestone;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.service.impl.ContractMilestoneServiceImpl;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.invoice.dto.request.InvoiceFromMilestoneReq;
import com.serviceops.modules.invoice.dto.response.InvoiceRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.InvoiceLine;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.service.MilestoneInvoiceService;
import com.serviceops.modules.invoice.service.impl.MilestoneInvoiceServiceImpl;
import com.serviceops.modules.invoice.validator.ContractValueLimitValidator;
import com.serviceops.modules.invoice.validator.MilestoneAcceptanceValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Chay {@link MilestoneInvoiceServiceImpl} tren JPA THAT (H2) — cac unit test dung mock repository nen khong bao gio
 * thuc thi truy van tong luy ke (QTN-19), khoa ghi dong hop dong va rang buoc UNIQUE cua bang {@code invoice_lines}
 * (V76). Phu 4 tieu chi cua NCL-10-CN-002: TC-01 lap dung gia tri moc va chuyen moc, TC-02 chan khi vuot gia tri
 * hop dong, va chot chan lap trung hoa don cho mot moc o tang CSDL.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({MilestoneInvoiceServiceImpl.class, ContractMilestoneServiceImpl.class, MilestoneAcceptanceValidator.class,
		ContractValueLimitValidator.class, MilestoneInvoiceIntegrationTest.ClockConfig.class})
class MilestoneInvoiceIntegrationTest {

	@TestConfiguration
	static class ClockConfig {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-09-21T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}
	}

	private static final AtomicInteger UNIQUE = new AtomicInteger();

	@MockBean private AuditLogService auditLogService;
	@MockBean private ContractAuditLogger contractAuditLogger;

	@Autowired private TestEntityManager em;
	@Autowired private MilestoneInvoiceService service;
	@Autowired private InvoiceRepository invoiceRepository;
	@Autowired private InvoiceLineRepository invoiceLineRepository;

	@Test
	@DisplayName("NCL-10-CN-002-TC-01: moc du dieu kien -> hoa don dung gia tri moc, dong hoa don gan moc, moc chuyen INVOICED")
	void invoicesReadyMilestoneAndPersistsInvoiceLineAndMilestoneStatus() {
		Contract contract = contract(ContractType.FIXED_PRICE, "1000000000.00", null);
		ContractMilestone milestone = milestone(contract, "Nghiem thu giai doan 1", "300000000.00",
				ContractMilestoneStatus.READY_TO_INVOICE);

		InvoiceRes res = service.createFromMilestone(contract.getId(), milestone.getId(),
				new InvoiceFromMilestoneReq(LocalDate.of(2026, 9, 30), "  Dot 1  ", null));
		em.flush();
		em.clear();

		assertThat(res.totalAmount()).isEqualByComparingTo("300000000.00");
		assertThat(res.invoicedTotal()).isEqualByComparingTo("300000000.00");
		assertThat(res.status()).isEqualTo("ISSUED");
		Invoice saved = invoiceRepository.findById(res.id()).orElseThrow();
		assertThat(saved.getContractId()).isEqualTo(contract.getId());
		assertThat(saved.getCustomerId()).isEqualTo(contract.getCustomerId());
		assertThat(saved.getInvoiceDate()).isEqualTo(LocalDate.of(2026, 9, 30));
		assertThat(saved.getNote()).isEqualTo("Dot 1");
		List<InvoiceLine> lines = invoiceLineRepository.findAll();
		assertThat(lines).hasSize(1);
		assertThat(lines.get(0).getContractMilestoneId()).isEqualTo(milestone.getId());
		assertThat(lines.get(0).getAmount()).isEqualByComparingTo("300000000.00");
		assertThat(em.find(ContractMilestone.class, milestone.getId()).getStatus())
				.isEqualTo(ContractMilestoneStatus.INVOICED);
	}

	@Test
	@DisplayName("NCL-10-CN-002-TC-02: tong hoa don da lap + hoa don moi vuot gia tri hop dong -> chan, yeu cau lap phu luc")
	void blocksInvoiceThatWouldExceedContractValueUsingRealCumulativeQuery() {
		Contract contract = contract(ContractType.MILESTONE, "1000000000.00", null);
		ContractMilestone first = milestone(contract, "Dot 1", "700000000.00",
				ContractMilestoneStatus.READY_TO_INVOICE);
		ContractMilestone second = milestone(contract, "Dot 2", "400000000.00",
				ContractMilestoneStatus.READY_TO_INVOICE);
		service.createFromMilestone(contract.getId(), first.getId(), null);

		assertThatThrownBy(() -> service.createFromMilestone(contract.getId(), second.getId(), null))
				.isInstanceOfSatisfying(BusinessRuleException.class, ex -> {
					assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
					assertThat(ex.getMessage()).contains("phu luc");
				});
		em.flush();
		em.clear();

		assertThat(invoiceRepository.count()).isEqualTo(1);
		assertThat(invoiceLineRepository.count()).isEqualTo(1);
		assertThat(em.find(ContractMilestone.class, second.getId()).getStatus())
				.isEqualTo(ContractMilestoneStatus.READY_TO_INVOICE);
	}

	@Test
	@DisplayName("QTN-19: hoa don da huy khong tinh vao tong luy ke nen khong chan hoa don moi")
	void cancelledInvoicesAreNotCountedTowardsContractValue() {
		Contract contract = contract(ContractType.FIXED_PRICE, "1000000000.00", null);
		Invoice cancelled = invoice(contract, "900000000.00", InvoiceStatus.CANCELLED);
		ContractMilestone milestone = milestone(contract, "Dot 1", "500000000.00",
				ContractMilestoneStatus.READY_TO_INVOICE);
		em.flush();

		InvoiceRes res = service.createFromMilestone(contract.getId(), milestone.getId(), null);

		assertThat(res.invoicedTotal()).isEqualByComparingTo("500000000.00");
		assertThat(cancelled.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
	}

	@Test
	@DisplayName("Lap hoa don lan hai cho cung mot moc bi chan o service (INVOICED) va chot UNIQUE o CSDL")
	void secondInvoiceForTheSameMilestoneIsBlockedByServiceAndByDatabase() {
		Contract contract = contract(ContractType.FIXED_PRICE, "1000000000.00", null);
		ContractMilestone milestone = milestone(contract, "Dot 1", "300000000.00",
				ContractMilestoneStatus.READY_TO_INVOICE);
		InvoiceRes first = service.createFromMilestone(contract.getId(), milestone.getId(), null);
		em.flush();

		assertThatThrownBy(() -> service.createFromMilestone(contract.getId(), milestone.getId(), null))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.INVALID_STATE));

		InvoiceLine duplicate = new InvoiceLine();
		duplicate.setInvoiceId(first.id());
		duplicate.setContractMilestoneId(milestone.getId());
		duplicate.setDescription("Trung");
		duplicate.setAmount(new BigDecimal("300000000.00"));
		assertThatThrownBy(() -> {
			invoiceLineRepository.saveAndFlush(duplicate);
		}).isInstanceOf(DataIntegrityViolationException.class);
	}

	// ---------- du lieu ----------

	private Contract contract(ContractType type, String totalValue, String limitValue) {
		int n = UNIQUE.incrementAndGet();
		LocalDateTime now = LocalDateTime.of(2026, 9, 1, 8, 0);
		Customer customer = new Customer();
		customer.setCode("KHM" + n);
		customer.setName("Khach hang " + n);
		customer.setCreatedAt(now);
		em.persist(customer);
		Contract contract = new Contract();
		contract.setContractCode("HDM" + n);
		contract.setName("Hop dong " + n);
		contract.setCustomerId(customer.getId());
		contract.setContractType(type);
		contract.setTotalValue(new BigDecimal(totalValue));
		if (limitValue != null) {
			contract.setLimitValue(new BigDecimal(limitValue));
		}
		contract.setCreatedAt(now);
		em.persist(contract);
		return contract;
	}

	private ContractMilestone milestone(Contract contract, String name, String amount,
			ContractMilestoneStatus status) {
		LocalDateTime now = LocalDateTime.of(2026, 9, 1, 8, 0);
		ContractMilestone milestone = new ContractMilestone();
		milestone.setContractId(contract.getId());
		milestone.setName(name);
		milestone.setAmount(new BigDecimal(amount));
		milestone.setStatus(status);
		milestone.setCreatedAt(now);
		milestone.setUpdatedAt(now);
		em.persist(milestone);
		em.flush();
		return milestone;
	}

	private Invoice invoice(Contract contract, String amount, InvoiceStatus status) {
		int n = UNIQUE.incrementAndGet();
		LocalDateTime now = LocalDateTime.of(2026, 9, 1, 8, 0);
		Invoice invoice = new Invoice();
		invoice.setInvoiceCode("INV-SEED-" + n);
		invoice.setContractId(contract.getId());
		invoice.setCustomerId(contract.getCustomerId());
		invoice.setStatus(status);
		invoice.setTotalAmount(new BigDecimal(amount));
		invoice.setInvoiceDate(LocalDate.of(2026, 9, 1));
		invoice.setCreatedAt(now);
		invoice.setUpdatedAt(now);
		em.persist(invoice);
		return invoice;
	}
}
