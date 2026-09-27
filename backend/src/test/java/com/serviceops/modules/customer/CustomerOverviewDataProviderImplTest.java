package com.serviceops.modules.customer;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.customer.dto.response.CustomerOverviewItemRes;
import com.serviceops.modules.customer.service.impl.CustomerOverviewDataProviderImpl;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.security.ProjectDataScopeGuard;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.PaymentRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;
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
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Unit test CustomerOverviewDataProviderImpl (NCL-02-CN-004): doc du lieu that
 * tu opportunity va contract, dung de ho so tong hop khach hang khong con luon
 * tra ve danh sach hop dong rong nhu ban EmptyCustomerOverviewDataProvider cu.
 */
@ExtendWith(MockitoExtension.class)
class CustomerOverviewDataProviderImplTest {

	@Mock
	private OpportunityRepository opportunityRepository;

	@Mock
	private ContractRepository contractRepository;

	@Mock
	private ProjectRepository projectRepository;

	@Mock
	private InvoiceRepository invoiceRepository;

	@Mock
	private PaymentRepository paymentRepository;

	@Mock
	private ProjectDataScopeGuard projectDataScopeGuard;

	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;

	@Mock
	private UserRepository userRepository;

	private final Clock clock = Clock.fixed(Instant.parse("2026-09-26T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

	private CustomerOverviewDataProviderImpl provider;

	@BeforeEach
	@SuppressWarnings("unchecked")
	void setUp() {
		provider = new CustomerOverviewDataProviderImpl(opportunityRepository, contractRepository, projectRepository,
				invoiceRepository, paymentRepository, projectDataScopeGuard, currentUserScopeProvider, userRepository,
				clock);
		lenient().when(currentUserScopeProvider.currentScope()).thenReturn(UserScope.company());
		lenient().when(projectDataScopeGuard.filterVisible(anyCollection()))
				.thenAnswer(inv -> List.copyOf((Collection<Project>) inv.getArgument(0)));
	}

	@Test
	void mapsOpportunitiesOfTheCustomer() {
		Opportunity opportunity = new Opportunity();
		opportunity.setId(1L);
		opportunity.setCustomerId(10L);
		opportunity.setName("Trien khai ERP");
		opportunity.setStage(OpportunityStage.WON);
		opportunity.setExpectedValue(new BigDecimal("500000000"));
		opportunity.setExpectedCloseDate(LocalDate.of(2026, 3, 1));
		when(opportunityRepository.findByCustomerId(10L)).thenReturn(List.of(opportunity));

		List<CustomerOverviewItemRes> result = provider.opportunities(10L);

		assertThat(result).hasSize(1);
		CustomerOverviewItemRes item = result.get(0);
		assertThat(item.id()).isEqualTo(1L);
		assertThat(item.code()).isNull();
		assertThat(item.name()).isEqualTo("Trien khai ERP");
		assertThat(item.status()).isEqualTo("WON");
		assertThat(item.amount()).isEqualByComparingTo("500000000");
		assertThat(item.date()).isEqualTo(LocalDate.of(2026, 3, 1));
	}

	@Test
	void mapsContractsOfTheCustomer() {
		Contract contract = new Contract();
		contract.setId(5L);
		contract.setCustomerId(10L);
		contract.setContractCode("HD-TEST");
		contract.setName("Hop dong ERP");
		contract.setContractType(ContractType.FIXED_PRICE);
		contract.setTotalValue(new BigDecimal("500000000"));
		contract.setStartDate(LocalDate.of(2026, 3, 1));
		contract.setStatus(ContractStatus.ACTIVE);
		when(contractRepository.findByCustomerId(10L)).thenReturn(List.of(contract));

		List<CustomerOverviewItemRes> result = provider.contracts(10L);

		assertThat(result).hasSize(1);
		CustomerOverviewItemRes item = result.get(0);
		assertThat(item.id()).isEqualTo(5L);
		assertThat(item.code()).isEqualTo("HD-TEST");
		assertThat(item.name()).isEqualTo("Hop dong ERP");
		assertThat(item.status()).isEqualTo("ACTIVE");
		assertThat(item.amount()).isEqualByComparingTo("500000000");
		assertThat(item.date()).isEqualTo(LocalDate.of(2026, 3, 1));
	}

	@Test
	void mapsProjectsOfTheCustomer() {
		Project project = new Project();
		project.setId(7L);
		project.setCustomerId(10L);
		project.setProjectCode("DA-TEST");
		project.setName("Du an ERP");
		project.setLimitValue(new BigDecimal("500000000"));
		project.setStartDate(LocalDate.of(2026, 3, 1));
		project.setStatus(ProjectStatus.RUNNING);
		when(projectRepository.findByCustomerIdOrderByIdDesc(10L)).thenReturn(List.of(project));

		List<CustomerOverviewItemRes> result = provider.projects(10L);

		assertThat(result).hasSize(1);
		CustomerOverviewItemRes item = result.get(0);
		assertThat(item.id()).isEqualTo(7L);
		assertThat(item.code()).isEqualTo("DA-TEST");
		assertThat(item.name()).isEqualTo("Du an ERP");
		assertThat(item.status()).isEqualTo("RUNNING");
		assertThat(item.amount()).isEqualByComparingTo("500000000");
		assertThat(item.date()).isEqualTo(LocalDate.of(2026, 3, 1));
	}

	@Test
	void mapsIssuedInvoicesOfTheCustomer() {
		when(contractRepository.findByCustomerId(10L)).thenReturn(List.of(contract(5L, "HD-01")));
		when(invoiceRepository.findByCustomerIdInAndStatusInOrderByInvoiceDateDescIdDesc(eq(List.of(10L)), anyCollection()))
				.thenReturn(List.of(invoice(20L, 5L, InvoiceStatus.ISSUED, "100000000", LocalDate.of(2026, 10, 30))));

		List<CustomerOverviewItemRes> result = provider.invoices(10L);

		assertThat(result).hasSize(1);
		assertThat(result.get(0).code()).isEqualTo("INV-20");
		assertThat(result.get(0).name()).isEqualTo("Hóa đơn hợp đồng HD-01");
		assertThat(result.get(0).status()).isEqualTo("ISSUED");
		assertThat(result.get(0).amount()).isEqualByComparingTo("100000000");
	}

	@Test
	void receivablesShowRemainingAmountAndFlagOverdue() {
		when(contractRepository.findByCustomerId(10L)).thenReturn(List.of(contract(5L, "HD-01")));
		when(invoiceRepository.findByCustomerIdInAndStatusInOrderByInvoiceDateDescIdDesc(eq(List.of(10L)), anyCollection()))
				.thenReturn(List.of(
						invoice(20L, 5L, InvoiceStatus.PARTIALLY_PAID, "100000000", LocalDate.of(2026, 9, 1)),
						invoice(21L, 5L, InvoiceStatus.ISSUED, "50000000", LocalDate.of(2026, 10, 30))));
		when(paymentRepository.sumAmountByInvoiceIdIn(List.of(20L, 21L)))
				.thenReturn(List.<Object[]>of(new Object[] {20L, new BigDecimal("60000000")}));

		List<CustomerOverviewItemRes> result = provider.receivables(10L);

		assertThat(result).hasSize(2);
		assertThat(result.get(0).amount()).isEqualByComparingTo("40000000");
		assertThat(result.get(0).status()).isEqualTo("OVERDUE");
		assertThat(result.get(1).amount()).isEqualByComparingTo("50000000");
		assertThat(result.get(1).status()).isEqualTo("ISSUED");
		assertThat(result.get(1).date()).isEqualTo(LocalDate.of(2026, 10, 30));
	}

	@Test
	@DisplayName("TC-02: nguoi chi duoc phan mot nhanh khong thay du an, hop dong va hoa don cua nhanh khac")
	void hidesDataOutsideTheViewerScope() {
		when(currentUserScopeProvider.currentScope()).thenReturn(new UserScope(DataScopeType.DEPARTMENT, Set.of(1L)));
		Project ownBranch = project(1L, 5L);
		Project otherBranch = project(2L, 6L);
		when(projectRepository.findByCustomerIdOrderByIdDesc(10L)).thenReturn(List.of(ownBranch, otherBranch));
		when(projectDataScopeGuard.filterVisible(anyCollection())).thenReturn(List.of(ownBranch));
		when(contractRepository.findByCustomerId(10L))
				.thenReturn(List.of(contract(5L, "HD-01"), contract(6L, "HD-02"), contract(7L, "HD-03")));
		when(invoiceRepository.findByCustomerIdInAndStatusInOrderByInvoiceDateDescIdDesc(eq(List.of(10L)), anyCollection()))
				.thenReturn(List.of(invoice(20L, 5L, InvoiceStatus.ISSUED, "1", LocalDate.of(2026, 10, 1)),
						invoice(21L, 6L, InvoiceStatus.ISSUED, "1", LocalDate.of(2026, 10, 1))));

		assertThat(provider.projects(10L)).extracting(CustomerOverviewItemRes::id).containsExactly(1L);
		// HD-02 co du an nhung du an o nhanh khac -> an; HD-03 chua co du an -> van hien de tao du an.
		assertThat(provider.contracts(10L)).extracting(CustomerOverviewItemRes::code).containsExactly("HD-01", "HD-03");
		assertThat(provider.invoices(10L)).extracting(CustomerOverviewItemRes::id).containsExactly(20L);
	}

	@Test
	@DisplayName("TC-02: pham vi ca nhan chi thay co hoi do chinh minh phu trach")
	void selfScopeSeesOnlyOwnOpportunities() {
		when(currentUserScopeProvider.currentScope()).thenReturn(new UserScope(DataScopeType.SELF, Set.of()));
		when(currentUserScopeProvider.currentUserId()).thenReturn(100L);
		when(opportunityRepository.findByCustomerId(10L)).thenReturn(List.of(opportunity(1L, 100L), opportunity(2L, 200L)));

		assertThat(provider.opportunities(10L)).extracting(CustomerOverviewItemRes::id).containsExactly(1L);
	}

	private Contract contract(Long id, String code) {
		Contract contract = new Contract();
		contract.setId(id);
		contract.setCustomerId(10L);
		contract.setContractCode(code);
		contract.setName("Hop dong " + code);
		contract.setStatus(ContractStatus.ACTIVE);
		return contract;
	}

	private Project project(Long id, Long contractId) {
		Project project = new Project();
		project.setId(id);
		project.setCustomerId(10L);
		project.setContractId(contractId);
		project.setProjectCode("DA-" + id);
		project.setStatus(ProjectStatus.RUNNING);
		return project;
	}

	private Opportunity opportunity(Long id, Long ownerId) {
		Opportunity opportunity = new Opportunity();
		opportunity.setId(id);
		opportunity.setCustomerId(10L);
		opportunity.setOwnerId(ownerId);
		opportunity.setStage(OpportunityStage.APPROACH);
		return opportunity;
	}

	private Invoice invoice(Long id, Long contractId, InvoiceStatus status, String total, LocalDate dueDate) {
		Invoice invoice = new Invoice();
		invoice.setId(id);
		invoice.setInvoiceCode("INV-" + id);
		invoice.setContractId(contractId);
		invoice.setCustomerId(10L);
		invoice.setStatus(status);
		invoice.setTotalAmount(new BigDecimal(total));
		invoice.setInvoiceDate(dueDate.minusDays(30));
		invoice.setDueDate(dueDate);
		return invoice;
	}
}
