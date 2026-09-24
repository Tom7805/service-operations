package com.serviceops.modules.customer;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.customer.service.impl.CustomerBusinessRecordMover;
import com.serviceops.modules.customer.service.impl.CustomerBusinessRecordMover.MovedRecords;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.InvoiceProposal;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.enums.ProjectStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * NCL-02-CN-006 TC-01/TC-02 tren JPA that (H2): gop ho so chuyen co hoi, hop dong, du an, hoa don va de nghi xuat
 * hoa don sang ho so giu lai, ghi vet nguon goc tung ban ghi; hoa don con no van duoc chuyen nguyen trang.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import(CustomerBusinessRecordMover.class)
class CustomerBusinessRecordMoverTest {

	private static final long SOURCE = 2L;
	private static final long TARGET = 1L;
	private static final long OTHER = 3L;
	private static final AtomicInteger UNIQUE = new AtomicInteger();

	@Autowired private TestEntityManager em;
	@Autowired private CustomerBusinessRecordMover mover;

	@Test
	@DisplayName("TC-01/TC-02: chuyen toan bo ban ghi nghiep vu ve ho so giu lai, giu cong no va ghi vet nguon goc")
	void movesAllBusinessRecordsWithOriginTrace() {
		Opportunity opportunity = opportunity(SOURCE);
		Contract contract = contract(SOURCE);
		Project project = project(SOURCE, contract);
		Invoice unpaid = invoice(SOURCE, contract, InvoiceStatus.PARTIALLY_PAID);
		InvoiceProposal proposal = proposal(SOURCE, contract, project);
		Contract untouched = contract(OTHER);

		assertThat(mover.countRecords(SOURCE)).isEqualTo(5);
		MovedRecords moved = mover.moveRecords(SOURCE, TARGET);
		em.clear();

		assertThat(moved.total()).isEqualTo(5);
		assertThat(moved.summary()).isEqualTo("1 co hoi, 1 hop dong, 1 du an, 1 hoa don, 1 de nghi xuat hoa don");
		assertThat(em.find(Opportunity.class, opportunity.getId()).getCustomerId()).isEqualTo(TARGET);
		assertThat(em.find(Opportunity.class, opportunity.getId()).getOriginalCustomerId()).isEqualTo(SOURCE);
		assertThat(em.find(Contract.class, contract.getId()).getCustomerId()).isEqualTo(TARGET);
		assertThat(em.find(Project.class, project.getId()).getOriginalCustomerId()).isEqualTo(SOURCE);
		Invoice movedInvoice = em.find(Invoice.class, unpaid.getId());
		assertThat(movedInvoice.getCustomerId()).isEqualTo(TARGET);
		assertThat(movedInvoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
		assertThat(movedInvoice.getTotalAmount()).isEqualByComparingTo("100000000");
		assertThat(em.find(InvoiceProposal.class, proposal.getId()).getCustomerId()).isEqualTo(TARGET);

		Contract other = em.find(Contract.class, untouched.getId());
		assertThat(other.getCustomerId()).isEqualTo(OTHER);
		assertThat(other.getOriginalCustomerId()).isNull();
		assertThat(mover.countRecords(SOURCE)).isZero();
	}

	@Test
	@DisplayName("Gop tiep lan hai: nguon goc giu la khach hang dau tien, khong bi ghi de")
	void keepsFirstOriginOnSecondMerge() {
		Contract contract = contract(SOURCE);
		mover.moveRecords(SOURCE, TARGET);
		mover.moveRecords(TARGET, OTHER);
		em.clear();

		Contract moved = em.find(Contract.class, contract.getId());
		assertThat(moved.getCustomerId()).isEqualTo(OTHER);
		assertThat(moved.getOriginalCustomerId()).isEqualTo(SOURCE);
	}

	private Opportunity opportunity(long customerId) {
		Opportunity value = new Opportunity();
		value.setName("Co hoi " + UNIQUE.incrementAndGet());
		value.setCustomerId(customerId);
		value.setExpectedValue(new BigDecimal("500000000"));
		value.setStage(OpportunityStage.APPROACH);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private Contract contract(long customerId) {
		int n = UNIQUE.incrementAndGet();
		Contract value = new Contract();
		value.setContractCode("HDGOP" + n);
		value.setName("Hop dong " + n);
		value.setCustomerId(customerId);
		value.setContractType(ContractType.FIXED_PRICE);
		value.setTotalValue(new BigDecimal("1000000000"));
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private Project project(long customerId, Contract contract) {
		int n = UNIQUE.incrementAndGet();
		Project value = new Project();
		value.setProjectCode("DA-GOP-" + n);
		value.setName("Du an " + n);
		value.setContractId(contract.getId());
		value.setCustomerId(customerId);
		value.setProjectType("FIXED_PRICE");
		value.setStartDate(LocalDate.of(2026, 9, 1));
		value.setExpectedEndDate(LocalDate.of(2026, 12, 31));
		value.setProjectManagerId(30L);
		value.setStatus(ProjectStatus.RUNNING);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private Invoice invoice(long customerId, Contract contract, InvoiceStatus status) {
		Invoice value = new Invoice();
		value.setInvoiceCode("INV-GOP-" + UNIQUE.incrementAndGet());
		value.setContractId(contract.getId());
		value.setCustomerId(customerId);
		value.setStatus(status);
		value.setTotalAmount(new BigDecimal("100000000"));
		value.setInvoiceDate(LocalDate.of(2026, 9, 1));
		value.setDueDate(LocalDate.of(2026, 10, 1));
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		value.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}

	private InvoiceProposal proposal(long customerId, Contract contract, Project project) {
		InvoiceProposal value = new InvoiceProposal();
		value.setProposalCode("DN-GOP-" + UNIQUE.incrementAndGet());
		value.setProjectId(project.getId());
		value.setContractId(contract.getId());
		value.setCustomerId(customerId);
		value.setPeriodFrom(LocalDate.of(2026, 9, 1));
		value.setPeriodTo(LocalDate.of(2026, 9, 30));
		value.setLaborAmount(BigDecimal.ZERO);
		value.setExpenseAmount(BigDecimal.ZERO);
		value.setTotalAmount(BigDecimal.ZERO);
		value.setCreatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		value.setUpdatedAt(LocalDateTime.of(2026, 9, 1, 8, 0));
		em.persist(value);
		return value;
	}
}
