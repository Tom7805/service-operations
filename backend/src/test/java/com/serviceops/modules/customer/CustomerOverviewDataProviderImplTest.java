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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
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

	private CustomerOverviewDataProviderImpl provider;

	@BeforeEach
	void setUp() {
		provider = new CustomerOverviewDataProviderImpl(opportunityRepository, contractRepository);
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
	void projectsInvoicesAndReceivablesStayEmptyUntilThoseModulesAreBuilt() {
		assertThat(provider.projects(10L)).isEmpty();
		assertThat(provider.invoices(10L)).isEmpty();
		assertThat(provider.receivables(10L)).isEmpty();
	}
}
