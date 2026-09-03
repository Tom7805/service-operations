package com.serviceops.modules.opportunity;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.mapper.OpportunityMapper;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.service.impl.OpportunityServiceImpl;
import com.serviceops.modules.opportunity.validator.StageTransitionValidator;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test OpportunityServiceImpl - NCL-03-CN-001 (TC-01: khach hang phai da co ho so,
 * TC-02: gia tri du kien phai la so duong, TC-04: ghi nhat ky khi tao thanh cong).
 */
@ExtendWith(MockitoExtension.class)
class OpportunityServiceTest {

	@Mock
	private OpportunityRepository opportunityRepository;

	@Mock
	private CustomerRepository customerRepository;

	@Mock
	private OpportunityAuditLogger auditLogger;

	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;

	private final OpportunityMapper opportunityMapper = new OpportunityMapper();

	private final StageTransitionValidator stageTransitionValidator = new StageTransitionValidator();

	private OpportunityServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new OpportunityServiceImpl(opportunityRepository, customerRepository, opportunityMapper,
				auditLogger, stageTransitionValidator, currentUserScopeProvider);

		lenient().when(opportunityRepository.save(any(Opportunity.class))).thenAnswer(inv -> {
			Opportunity opportunity = inv.getArgument(0);
			if (opportunity.getId() == null) {
				opportunity.setId(1L);
			}
			return opportunity;
		});
	}

	private Customer existingCustomer(long id) {
		Customer customer = new Customer();
		customer.setId(id);
		customer.setName("Cong ty TNHH ABC");
		return customer;
	}

	@Test
	@DisplayName("TC-01: khach hang da co ho so thi tao co hoi thanh cong o giai doan APPROACH")
	void createsOpportunityForExistingCustomer() {
		when(customerRepository.findById(10L)).thenReturn(Optional.of(existingCustomer(10L)));

		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 10L,
				new BigDecimal("500000000"), LocalDate.now().plusMonths(1), null);

		OpportunityRes result = service.create(req);

		assertThat(result.name()).isEqualTo("Trien khai ERP");
		assertThat(result.customerId()).isEqualTo(10L);
		assertThat(result.customerName()).isEqualTo("Cong ty TNHH ABC");
		assertThat(result.stage()).isEqualTo(OpportunityStage.APPROACH.name());
		assertThat(result.status()).isEqualTo(OpportunityStatus.OPEN.name());
	}

	@Test
	@DisplayName("TC-01: khach hang khong co ho so thi bao RESOURCE_NOT_FOUND, khong luu")
	void rejectsWhenCustomerMissing() {
		when(customerRepository.findById(99L)).thenReturn(Optional.empty());

		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 99L,
				new BigDecimal("500000000"), null, null);

		assertThatThrownBy(() -> service.create(req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);

		verify(opportunityRepository, never()).save(any());
	}

	@Test
	@DisplayName("Ten co hoi de trong (chi khoang trang) thi bao VALIDATION_ERROR, khong luu")
	void rejectsBlankName() {
		OpportunityCreateReq req = new OpportunityCreateReq("   ", 10L,
				new BigDecimal("500000000"), null, null);

		assertThatThrownBy(() -> service.create(req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(opportunityRepository, never()).save(any());
	}

	@Test
	@DisplayName("TC-02: gia tri du kien am thi bao VALIDATION_ERROR, khong luu")
	void rejectsNegativeExpectedValue() {
		when(customerRepository.findById(10L)).thenReturn(Optional.of(existingCustomer(10L)));

		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 10L,
				new BigDecimal("-1"), null, null);

		assertThatThrownBy(() -> service.create(req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(opportunityRepository, never()).save(any());
	}

	@Test
	@DisplayName("TC-02: gia tri du kien null thi bao VALIDATION_ERROR")
	void rejectsNullExpectedValue() {
		when(customerRepository.findById(10L)).thenReturn(Optional.of(existingCustomer(10L)));

		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 10L, null, null, null);

		assertThatThrownBy(() -> service.create(req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("Khong chi dinh nguoi phu trach thi mac dinh la nguoi tao")
	void defaultsOwnerToCurrentUser() {
		when(customerRepository.findById(10L)).thenReturn(Optional.of(existingCustomer(10L)));
		when(currentUserScopeProvider.currentUserId()).thenReturn(42L);

		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 10L,
				new BigDecimal("500000000"), null, null);

		OpportunityRes result = service.create(req);

		assertThat(result.ownerId()).isEqualTo(42L);
	}

	@Test
	@DisplayName("Co chi dinh nguoi phu trach thi giu nguyen gia tri duoc chi dinh")
	void keepsExplicitOwner() {
		when(customerRepository.findById(10L)).thenReturn(Optional.of(existingCustomer(10L)));

		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 10L,
				new BigDecimal("500000000"), null, 7L);

		OpportunityRes result = service.create(req);

		assertThat(result.ownerId()).isEqualTo(7L);
	}

	@Test
	@DisplayName("TC-04: tao co hoi thanh cong thi ghi nhat ky CREATE")
	void recordsAuditLogOnCreate() {
		when(customerRepository.findById(10L)).thenReturn(Optional.of(existingCustomer(10L)));

		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 10L,
				new BigDecimal("500000000"), null, null);

		service.create(req);

		ArgumentCaptor<Long> idCaptor = ArgumentCaptor.forClass(Long.class);
		verify(auditLogger).recordCreate(idCaptor.capture(), anyString());
		assertThat(idCaptor.getValue()).isEqualTo(1L);
	}
}
