package com.serviceops.modules.customer;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.response.CustomerOverviewItemRes;
import com.serviceops.modules.customer.dto.response.CustomerOverviewRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerOverviewDataProvider;
import com.serviceops.modules.customer.service.impl.CustomerOverviewServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerOverviewServiceTest {

	@Mock
	private CustomerRepository customerRepository;

	@Mock
	private CustomerOverviewDataProvider dataProvider;

	@Mock
	private CustomerAuditLogRepository auditLogRepository;

	private CustomerOverviewServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new CustomerOverviewServiceImpl(customerRepository, new CustomerMapper(), dataProvider,
				auditLogRepository);
	}

	@Test
	void returnsCustomerOverviewWithRelatedDataOrderedByDate() {
		Customer customer = new Customer();
		customer.setId(1L);
		customer.setCode("KH-000001");
		customer.setName("Cong ty TNHH ABC");
		customer.setCreatedAt(LocalDateTime.of(2026, 1, 1, 8, 0));
		when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
		when(dataProvider.opportunities(1L)).thenReturn(List.of(
				new CustomerOverviewItemRes(2L, "CH-02", "Moi", "OPEN", BigDecimal.TEN, LocalDate.of(2026, 2, 1)),
				new CustomerOverviewItemRes(1L, "CH-01", "Cu", "OPEN", BigDecimal.ONE, LocalDate.of(2026, 1, 1))));
		when(dataProvider.contracts(1L)).thenReturn(List.of());
		when(dataProvider.projects(1L)).thenReturn(List.of());
		when(dataProvider.invoices(1L)).thenReturn(List.of());
		when(dataProvider.receivables(1L)).thenReturn(List.of());

		CustomerOverviewRes result = service.getOverview(1L);

		assertThat(result.customer().code()).isEqualTo("KH-000001");
		assertThat(result.opportunities()).extracting(CustomerOverviewItemRes::id)
				.containsExactly(1L, 2L);
		verify(auditLogRepository).save(any());
	}

	@Test
	void rejectsUnknownCustomer() {
		when(customerRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.getOverview(99L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}
}
