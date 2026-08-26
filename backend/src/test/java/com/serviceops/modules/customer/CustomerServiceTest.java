package com.serviceops.modules.customer;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerDuplicateOverrideLogRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerDuplicateService;
import com.serviceops.modules.customer.service.impl.CustomerServiceImpl;
import com.serviceops.modules.customer.validator.CustomerDuplicateValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Unit test CustomerServiceImpl - cover TC-01, TC-02 cua NCL-02-CN-001.
 */
@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

	@Mock
	private CustomerRepository customerRepository;

	@Mock
	private CustomerDuplicateService customerDuplicateService;

	@Mock
	private CustomerDuplicateOverrideLogRepository overrideLogRepository;

	@Mock
	private CustomerAuditLogRepository auditLogRepository;

	private final CustomerMapper customerMapper = new CustomerMapper();

	private final CustomerDuplicateValidator customerDuplicateValidator = new CustomerDuplicateValidator();

	private CustomerServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new CustomerServiceImpl(customerRepository, customerMapper, customerDuplicateService,
				overrideLogRepository, auditLogRepository, customerDuplicateValidator);

		lenient().when(customerRepository.existsByCode(anyString())).thenReturn(false);
		lenient().when(customerDuplicateService.findDuplicates(anyString(), any(), any()))
				.thenReturn(List.of());
		lenient().when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> {
			Customer customer = inv.getArgument(0);
			if (customer.getId() == null) {
				customer.setId(1L);
			}
			return customer;
		});
	}

	@Test
	@DisplayName("TC-01: nhap du thong tin thi tao ho so va cap ma khach hang duy nhat")
	void createsCustomerWithGeneratedCode() {
		CustomerCreateReq req = new CustomerCreateReq("Cong ty TNHH ABC", "0101234567", "0987654321", "Cong nghe thong tin", "Ha Noi");

		CustomerRes result = service.create(req);

		assertThat(result.name()).isEqualTo("Cong ty TNHH ABC");
		assertThat(result.code()).startsWith("KH-");
		assertThat(result.taxCode()).isEqualTo("0101234567");
	}

	@Test
	@DisplayName("TC-02: chua nhap ten khach hang thi bao loi va khong luu")
	void rejectsBlankName() {
		CustomerCreateReq req = new CustomerCreateReq("   ", null, null, null, null);

		assertThatThrownBy(() -> service.create(req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
	}

	@Test
	@DisplayName("Ma khach hang trung thi sinh lai ma khac cho toi khi duy nhat")
	void regeneratesCodeUntilUnique() {
		when(customerRepository.existsByCode(anyString())).thenReturn(true, true, false);

		CustomerCreateReq req = new CustomerCreateReq("Cong ty XYZ", null, null, null, null);

		CustomerRes result = service.create(req);

		assertThat(result.code()).startsWith("KH-");
	}
}
