package com.serviceops.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import com.serviceops.common.api.PageRes;
import com.serviceops.modules.contract.dto.response.ContractPageSummaryRes;
import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.mapper.ContractMapper;
import com.serviceops.modules.contract.service.ContractPageQueryService;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.service.impl.InvoiceServiceImpl;
import com.serviceops.modules.opportunity.dto.response.OpportunityPageSummaryRes;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.mapper.OpportunityMapper;
import com.serviceops.modules.opportunity.service.OpportunityPageQueryService;
import com.serviceops.modules.opportunity.service.impl.OpportunityStageDurationCalculator;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.service.impl.ProjectServiceImpl;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;

/**
 * Danh sach phan trang phia may chu cua co hoi, hop dong, hoa don va du an chay tren JPA THAT (H2):
 * bo loc (ke ca tim theo ten ban ghi lien ket), pham vi QTN-01 va so lieu tong hop tinh bang SQL.
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@ActiveProfiles("test")
@Import({ OpportunityPageQueryService.class, OpportunityMapper.class, OpportunityStageDurationCalculator.class,
		ContractPageQueryService.class, ContractMapper.class, InvoiceServiceImpl.class, ProjectServiceImpl.class })
class PagedListQueriesTest {

	@MockBean private CurrentUserScopeProvider scopeProvider;
	@MockBean private ProjectAuditLogger projectAuditLogger;

	@Autowired private TestEntityManager em;
	@Autowired private OpportunityPageQueryService opportunities;
	@Autowired private ContractPageQueryService contracts;
	@Autowired private InvoiceServiceImpl invoices;
	@Autowired private ProjectServiceImpl projects;

	private User salesA;
	private User salesB;
	private Customer acme;
	private Customer globex;

	@BeforeEach
	void setUp() {
		salesA = user("salesA", 10L);
		salesB = user("salesB", 20L);
		acme = customer("Acme Viet Nam");
		globex = customer("Globex");
		when(scopeProvider.currentScope()).thenReturn(UserScope.company());
		when(scopeProvider.currentUserId()).thenReturn(salesA.getId());
	}

	@Test
	@DisplayName("Co hoi: tim theo ten khach hang, loc giai doan; thong ke tren toan pham vi")
	void opportunitiesFilterAndSummary() {
		opportunity("Trien khai ERP", acme, "1000.00", "50.00", OpportunityStage.PROPOSAL, salesA);
		opportunity("Bao tri he thong", globex, "400.00", "100.00", OpportunityStage.WON, salesB);
		opportunity("Tu van", acme, "600.00", null, OpportunityStage.APPROACH, salesB);
		em.flush();

		PageRes<OpportunityRes, OpportunityPageSummaryRes> byCustomer = opportunities.findPage("acme", null, null, true, 0, 10);
		assertThat(byCustomer.content()).extracting(OpportunityRes::name)
				.containsExactlyInAnyOrder("Trien khai ERP", "Tu van");
		assertThat(byCustomer.content()).allSatisfy(o -> assertThat(o.customerName()).isEqualTo("Acme Viet Nam"));

		assertThat(opportunities.findPage(null, OpportunityStage.WON, null, true, 0, 10).content())
				.extracting(OpportunityRes::name).containsExactly("Bao tri he thong");

		OpportunityPageSummaryRes summary = byCustomer.summary();
		assertThat(summary.total()).isEqualTo(3);
		assertThat(summary.totalExpectedValue()).isEqualByComparingTo("2000.00");
		// 1000 x 50% + 400 x 100%; dong thieu xac suat khong duoc tinh.
		assertThat(summary.weightedForecastValue()).isEqualByComparingTo("900.00");
		assertThat(summary.wonCount()).isEqualTo(1);
	}

	@Test
	@DisplayName("Co hoi: pham vi DEPARTMENT ap dung ca cho danh sach lan thong ke")
	void opportunitiesDepartmentScope() {
		opportunity("Trien khai ERP", acme, "1000.00", "50.00", OpportunityStage.PROPOSAL, salesA);
		opportunity("Bao tri he thong", globex, "400.00", "100.00", OpportunityStage.WON, salesB);
		em.flush();
		when(scopeProvider.currentScope()).thenReturn(new UserScope(DataScopeType.DEPARTMENT, Set.of(10L)));

		PageRes<OpportunityRes, OpportunityPageSummaryRes> page = opportunities.findPage(null, null, null, true, 0, 10);

		assertThat(page.content()).extracting(OpportunityRes::name).containsExactly("Trien khai ERP");
		assertThat(page.summary().total()).isEqualTo(1);
		assertThat(page.summary().wonCount()).isZero();
	}

	@Test
	@DisplayName("Co hoi: loc theo id van ton trong pham vi — co hoi ngoai pham vi khong lo ra")
	void opportunityByIdRespectsScope() {
		opportunity("Trien khai ERP", acme, "1000.00", "50.00", OpportunityStage.PROPOSAL, salesA);
		opportunity("Bao tri he thong", globex, "400.00", "100.00", OpportunityStage.WON, salesB);
		em.flush();
		Long otherTeamId = opportunities.findPage("bao tri", null, null, true, 0, 10).content().get(0).id();

		assertThat(opportunities.findPage(null, null, List.of(otherTeamId), true, 0, 1).content()).extracting(OpportunityRes::name)
				.containsExactly("Bao tri he thong");
		when(scopeProvider.currentScope()).thenReturn(new UserScope(DataScopeType.DEPARTMENT, Set.of(10L)));
		assertThat(opportunities.findPage(null, null, List.of(otherTeamId), true, 0, 1).content()).isEmpty();
	}

	@Test
	@DisplayName("Co hoi: tra theo lo nhieu id, tu khoa la so khop ca ma so, bo so lieu tong hop khi khong can")
	void opportunitiesByIdsAndNumericKeyword() {
		opportunity("Trien khai ERP", acme, "1000.00", "50.00", OpportunityStage.PROPOSAL, salesA);
		opportunity("Bao tri he thong", globex, "400.00", "100.00", OpportunityStage.WON, salesB);
		opportunity("Tu van", acme, "600.00", null, OpportunityStage.APPROACH, salesB);
		em.flush();
		java.util.Map<String, Long> idByName = new java.util.HashMap<>();
		opportunities.findPage(null, null, null, true, 0, 10).content().forEach(o -> idByName.put(o.name(), o.id()));

		PageRes<OpportunityRes, OpportunityPageSummaryRes> byIds = opportunities.findPage(null, null,
				List.of(idByName.get("Trien khai ERP"), idByName.get("Tu van")), false, 0, 10);
		assertThat(byIds.content()).extracting(OpportunityRes::name).containsExactlyInAnyOrder("Trien khai ERP", "Tu van");
		assertThat(byIds.summary()).isNull();

		String numeric = String.valueOf(idByName.get("Bao tri he thong"));
		assertThat(opportunities.findPage(numeric, null, null, false, 0, 10).content()).extracting(OpportunityRes::id)
				.contains(idByName.get("Bao tri he thong"));
	}

	@Test
	@DisplayName("Hop dong: tim theo ma/ten khach hang, loc trang thai; thong ke khong theo bo loc")
	void contractsFilterAndSummary() {
		contract("HD-001", acme, ContractStatus.ACTIVE, null);
		contract("HD-002", globex, ContractStatus.DRAFT, "500.00");
		contract("HD-003", globex, ContractStatus.ACTIVE, "800.00");
		em.flush();

		assertThat(contracts.findPage("globex", ContractStatus.ACTIVE, true, 0, 10).content())
				.extracting(ContractRes::contractCode).containsExactly("HD-003");
		assertThat(contracts.findPage("hd-001", null, true, 0, 10).content()).extracting(ContractRes::customerName)
				.containsExactly("Acme Viet Nam");

		ContractPageSummaryRes summary = contracts.findPage("khong-khop", null, true, 0, 10).summary();
		assertThat(summary).isEqualTo(new ContractPageSummaryRes(3, 2, 1, 1));
	}

	@Test
	@DisplayName("Hoa don: tim theo ma hop dong hoac ten khach hang, phan trang moi nhat truoc")
	void invoicesFilterAndPaging() {
		Contract c1 = contract("HD-ABC", acme, ContractStatus.ACTIVE, null);
		Contract c2 = contract("HD-XYZ", globex, ContractStatus.ACTIVE, null);
		invoice("INV-1", c1, InvoiceStatus.ISSUED);
		invoice("INV-2", c2, InvoiceStatus.PAID);
		invoice("INV-3", c2, InvoiceStatus.ISSUED);
		em.flush();

		assertThat(invoices.listPage("hd-abc", null, 0, 10).content()).extracting(InvoiceDetailRes::invoiceCode)
				.containsExactly("INV-1");
		assertThat(invoices.listPage("globex", InvoiceStatus.ISSUED, 0, 10).content())
				.extracting(InvoiceDetailRes::invoiceCode).containsExactly("INV-3");

		PageRes<InvoiceDetailRes, Void> first = invoices.listPage(null, null, 0, 2);
		assertThat(first.totalElements()).isEqualTo(3);
		assertThat(first.totalPages()).isEqualTo(2);
		assertThat(first.content()).extracting(InvoiceDetailRes::invoiceCode).containsExactly("INV-3", "INV-2");
	}

	@Test
	@DisplayName("Du an: tim theo ma hoac ten, kich thuoc trang bi gioi han")
	void projectsSearch() {
		Contract c1 = contract("HD-P", acme, ContractStatus.ACTIVE, null);
		project("DA-ALPHA", "Cong thong tin", c1);
		project("DA-BETA", "Ung dung di dong", c1);
		em.flush();

		assertThat(projects.listPage("alpha", 0, 10).content()).extracting(ProjectRes::projectCode)
				.containsExactly("DA-ALPHA");
		assertThat(projects.listPage("di dong", 0, 10).content()).extracting(ProjectRes::projectCode)
				.containsExactly("DA-BETA");
		assertThat(projects.listPage(null, -3, 5000).size()).isEqualTo(100);
	}

	private User user(String username, Long departmentId) {
		User u = new User();
		u.setUsername(username);
		u.setPasswordHash("x");
		u.setFullName(username);
		u.setDepartmentId(departmentId);
		em.persist(u);
		return u;
	}

	private Customer customer(String name) {
		Customer customer = new Customer();
		customer.setCode("KH" + System.nanoTime());
		customer.setName(name);
		customer.setCreatedAt(LocalDateTime.of(2026, 1, 1, 8, 0));
		em.persist(customer);
		return customer;
	}

	private void opportunity(String name, Customer customer, String value, String probability, OpportunityStage stage,
			User owner) {
		Opportunity o = new Opportunity();
		o.setName(name);
		o.setCustomerId(customer.getId());
		o.setExpectedValue(new BigDecimal(value));
		o.setProbability(probability == null ? null : new BigDecimal(probability));
		o.setStage(stage);
		o.setStatus(stage == OpportunityStage.WON ? OpportunityStatus.CLOSED : OpportunityStatus.OPEN);
		o.setOwnerId(owner.getId());
		o.setCreatedAt(LocalDateTime.of(2026, 1, 1, 8, 0));
		em.persist(o);
	}

	private Contract contract(String code, Customer customer, ContractStatus status, String limit) {
		Contract contract = new Contract();
		contract.setContractCode(code);
		contract.setName("Hop dong " + code);
		contract.setCustomerId(customer.getId());
		contract.setContractType(ContractType.TIME_AND_MATERIAL);
		contract.setTotalValue(new BigDecimal("1000.00"));
		contract.setLimitValue(limit == null ? null : new BigDecimal(limit));
		contract.setStatus(status);
		contract.setCreatedAt(LocalDateTime.of(2026, 1, 1, 8, 0));
		em.persist(contract);
		return contract;
	}

	private void invoice(String code, Contract contract, InvoiceStatus status) {
		LocalDateTime now = LocalDateTime.of(2026, 1, 1, 8, 0);
		Invoice invoice = new Invoice();
		invoice.setInvoiceCode(code);
		invoice.setContractId(contract.getId());
		invoice.setCustomerId(contract.getCustomerId());
		invoice.setStatus(status);
		invoice.setTotalAmount(new BigDecimal("100.00"));
		invoice.setInvoiceDate(LocalDate.of(2026, 1, 1));
		invoice.setDueDate(LocalDate.of(2026, 2, 1));
		invoice.setCreatedAt(now);
		invoice.setUpdatedAt(now);
		em.persist(invoice);
	}

	private void project(String code, String name, Contract contract) {
		Project project = new Project();
		project.setProjectCode(code);
		project.setName(name);
		project.setContractId(contract.getId());
		project.setCustomerId(contract.getCustomerId());
		project.setProjectType("FIXED_PRICE");
		project.setStartDate(LocalDate.of(2026, 1, 1));
		project.setExpectedEndDate(LocalDate.of(2026, 12, 31));
		project.setProjectManagerId(salesA.getId());
		project.setCreatedAt(LocalDateTime.of(2026, 1, 1, 8, 0));
		em.persist(project);
	}
}
