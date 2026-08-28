package com.serviceops.modules.customer;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.DuplicateOverrideReq;
import com.serviceops.modules.customer.dto.request.CustomerSearchReq;
import com.serviceops.modules.customer.dto.request.CustomerSegmentReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.entity.CustomerDuplicateOverrideLog;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test CustomerServiceImpl - cover NCL-02-CN-001 (tao ho so) va
 * NCL-02-CN-002 (chong trung ho so: TC-01 chan luu, TC-02 tao voi ly do bo qua,
 * TC-05 ghi nhat ky).
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
	@DisplayName("NCL-02-CN-001 TC-01: nhap du thong tin thi tao ho so va cap ma khach hang duy nhat")
	void createsCustomerWithGeneratedCode() {
		CustomerCreateReq req = new CustomerCreateReq("Cong ty TNHH ABC", "0101234567", "0987654321", "Cong nghe thong tin", "Ha Noi");

		CustomerRes result = service.create(req);

		assertThat(result.name()).isEqualTo("Cong ty TNHH ABC");
		assertThat(result.code()).startsWith("KH-");
		assertThat(result.taxCode()).isEqualTo("0101234567");
	}

	@Test
	@DisplayName("NCL-02-CN-001 TC-02: chua nhap ten khach hang thi bao loi va khong luu")
	void rejectsBlankName() {
		CustomerCreateReq req = new CustomerCreateReq("   ", null, null, null, null);

		assertThatThrownBy(() -> service.create(req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(customerRepository, never()).save(any());
	}

	@Test
	@DisplayName("Ma khach hang trung thi sinh lai ma khac cho toi khi duy nhat")
	void regeneratesCodeUntilUnique() {
		when(customerRepository.existsByCode(anyString())).thenReturn(true, true, false);

		CustomerCreateReq req = new CustomerCreateReq("Cong ty XYZ", null, null, null, null);

		CustomerRes result = service.create(req);

		assertThat(result.code()).startsWith("KH-");
	}

	@Test
	@DisplayName("NCL-02-CN-002 TC-05: tao ho so thanh cong thi ghi nhat ky CREATE")
	void recordsAuditLogOnCreate() {
		service.create(new CustomerCreateReq("Cong ty TNHH ABC", null, null, null, null));

		ArgumentCaptor<CustomerAuditLog> captor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(auditLogRepository).save(captor.capture());
		assertThat(captor.getValue().getActionType()).isEqualTo(CustomerAuditAction.CREATE);
	}

	@Test
	@DisplayName("NCL-02-CN-002 TC-01: co ho so nghi trung giong cao thi chan luu, khong tao ho so")
	void blocksCreateWhenDuplicateFound() {
		DuplicateCandidateRes highMatch = new DuplicateCandidateRes(
				9L, "KH-9", "Cong ty TNHH ABC", "0101234567", "0987654321", 0.95, List.of("maSoThue"));
		when(customerDuplicateService.findDuplicates(anyString(), any(), any())).thenReturn(List.of(highMatch));

		CustomerCreateReq req = new CustomerCreateReq("Cong ty TNHH ABC", "0101234567", "0987654321", null, null);

		assertThatThrownBy(() -> service.create(req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.DUPLICATE_DATA);

		verify(customerRepository, never()).save(any());
		verify(auditLogRepository, never()).save(any());
	}

	@Test
	@DisplayName("NCL-02-CN-002 TC-02: xac nhan tao moi kem ly do thi tao ho so va luu ly do bo qua canh bao")
	void createsWithOverrideReasonWhenDuplicateConfirmedDifferent() {
		CustomerCreateReq req = new CustomerCreateReq("Cong ty TNHH ABC", "0101234567", "0987654321", null, null);
		DuplicateOverrideReq override = new DuplicateOverrideReq("Hai phap nhan khac nhau, chi trung ten viet tat");

		CustomerRes result = service.createWithOverride(req, override);

		assertThat(result.name()).isEqualTo("Cong ty TNHH ABC");

		ArgumentCaptor<CustomerDuplicateOverrideLog> overrideCaptor = ArgumentCaptor.forClass(CustomerDuplicateOverrideLog.class);
		verify(overrideLogRepository).save(overrideCaptor.capture());
		assertThat(overrideCaptor.getValue().getReason()).isEqualTo(override.reason());

		ArgumentCaptor<CustomerAuditLog> auditCaptor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(auditLogRepository).save(auditCaptor.capture());
		assertThat(auditCaptor.getValue().getActionType()).isEqualTo(CustomerAuditAction.CREATE_WITH_OVERRIDE);
	}

	@Test
	@DisplayName("NCL-02-CN-002 TC-02: xac nhan tao moi ma khong nhap ly do thi bi tu choi, khong luu gi ca")
	void rejectsOverrideWithoutReason() {
		CustomerCreateReq req = new CustomerCreateReq("Cong ty TNHH ABC", null, null, null, null);
		DuplicateOverrideReq blankReason = new DuplicateOverrideReq(" ");

		assertThatThrownBy(() -> service.createWithOverride(req, blankReason))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(customerRepository, never()).save(any());
		verify(overrideLogRepository, never()).save(any());
		verify(auditLogRepository, never()).save(any());
	}

	@Test
	@DisplayName("NCL-02-CN-005 TC-01: cap nhat nganh, quy mo va uu tien thanh cong")
	void updatesCustomerSegmentAndRecordsAudit() {
		Customer customer = new Customer();
		customer.setId(1L);
		customer.setName("Cong ty ABC");
		when(customerRepository.findById(1L)).thenReturn(java.util.Optional.of(customer));
		when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

		CustomerRes result = service.updateSegment(1L,
				new CustomerSegmentReq("Cong nghe", "Vua", "Uu tien"));

		assertThat(result.industry()).isEqualTo("Cong nghe");
		assertThat(result.companySize()).isEqualTo("Vua");
		assertThat(result.priority()).isEqualTo("Uu tien");
		ArgumentCaptor<CustomerAuditLog> auditCaptor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(auditLogRepository).save(auditCaptor.capture());
		assertThat(auditCaptor.getValue().getActionType()).isEqualTo(CustomerAuditAction.SEGMENT_UPDATE);
	}

	@Test
	@DisplayName("NCL-02-CN-005 TC-01: loc danh sach theo nganh, quy mo va uu tien")
	void filtersCustomersBySegment() {
		Customer matching = new Customer();
		matching.setIndustry("Cong nghe");
		matching.setCompanySize("Vua");
		matching.setPriority("Uu tien");
		Customer other = new Customer();
		other.setIndustry("Tai chinh");
		other.setCompanySize("Lon");
		other.setPriority("Thuong");
		when(customerRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(matching, other));

		CustomerSearchReq request = new CustomerSearchReq();
		request.setIndustry("cong nghe");
		request.setCompanySize("vua");
		request.setPriority("uu tien");

		assertThat(service.findAll(request)).hasSize(1);
	}
}
