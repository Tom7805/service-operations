package com.serviceops.modules.customer;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerMergeReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.MergePreviewRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.entity.CustomerDuplicateOverrideLog;
import com.serviceops.modules.customer.entity.CustomerMergeLog;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.enums.CustomerStatus;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerDuplicateOverrideLogRepository;
import com.serviceops.modules.customer.repository.CustomerMergeLogRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.impl.CustomerMergeServiceImpl;
import com.serviceops.security.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test CustomerMergeServiceImpl - cover NCL-02-CN-006: gop hai ho so khach hang
 * trung (TC-01 luong thanh cong, TC-02 ngoai le van gop va giu vet nguon goc,
 * TC-04 luu lich su). TC-03 (khong co quyen) duoc kiem tra o tang HTTP, xem
 * {@link CustomerMergeControllerIT}.
 */
@ExtendWith(MockitoExtension.class)
class CustomerMergeServiceTest {

	@Mock
	private CustomerRepository customerRepository;

	@Mock
	private CustomerAuditLogRepository auditLogRepository;

	@Mock
	private CustomerDuplicateOverrideLogRepository overrideLogRepository;

	@Mock
	private CustomerMergeLogRepository mergeLogRepository;

	@Mock
	private CustomUserDetails userDetails;

	@Mock
	private com.serviceops.common.audit.service.AuditLogService systemAuditLogService;

	private final CustomerMapper customerMapper = new CustomerMapper();

	private CustomerMergeServiceImpl service;

	private Customer target;
	private Customer source;

	@BeforeEach
	void setUp() {
		service = new CustomerMergeServiceImpl(customerRepository, customerMapper, auditLogRepository,
				overrideLogRepository, mergeLogRepository, systemAuditLogService);

		target = new Customer();
		target.setId(1L);
		target.setCode("KH-000001");
		target.setName("Cong ty TNHH ABC");

		source = new Customer();
		source.setId(2L);
		source.setCode("KH-000002");
		source.setName("Cong ty TNHH ABC (chi nhanh)");

		lenient().when(customerRepository.findById(1L)).thenReturn(Optional.of(target));
		lenient().when(customerRepository.findById(2L)).thenReturn(Optional.of(source));
		lenient().when(auditLogRepository.findByCustomerIdOrderByCreatedAtDesc(2L)).thenReturn(List.of());
		lenient().when(overrideLogRepository.findByCustomerId(2L)).thenReturn(List.of());

		lenient().when(userDetails.getId()).thenReturn(99L);
		lenient().when(userDetails.getUsername()).thenReturn("admin01");
		SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(userDetails, null));
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	private CustomerAuditLog auditLogOf(Long customerId) {
		CustomerAuditLog log = new CustomerAuditLog();
		log.setCustomerId(customerId);
		log.setActionType(CustomerAuditAction.CREATE);
		log.setDetail("Tao ho so khach hang");
		return log;
	}

	private CustomerDuplicateOverrideLog overrideLogOf(Long customerId) {
		CustomerDuplicateOverrideLog log = new CustomerDuplicateOverrideLog();
		log.setCustomerId(customerId);
		log.setReason("Ly do bo qua canh bao trung");
		log.setOverriddenByUserId(1L);
		return log;
	}

	@Test
	@DisplayName("TC-01: gop thanh cong thi chuyen du lieu lien quan ve ho so giu lai va danh dau ho so bi gop la da gop")
	void mergesSuccessfullyAndMarksSourceAsMerged() {
		CustomerAuditLog sourceAuditLog = auditLogOf(2L);
		CustomerDuplicateOverrideLog sourceOverrideLog = overrideLogOf(2L);
		when(auditLogRepository.findByCustomerIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(sourceAuditLog));
		when(overrideLogRepository.findByCustomerId(2L)).thenReturn(List.of(sourceOverrideLog));

		CustomerRes result = service.merge(new CustomerMergeReq(1L, 2L));

		assertThat(result.id()).isEqualTo(1L);
		assertThat(result.code()).isEqualTo("KH-000001");

		assertThat(source.getStatus()).isEqualTo(CustomerStatus.MERGED);
		assertThat(source.getMergedIntoId()).isEqualTo(1L);
		assertThat(source.getMergedAt()).isNotNull();

		ArgumentCaptor<Customer> customerCaptor = ArgumentCaptor.forClass(Customer.class);
		verify(customerRepository).save(customerCaptor.capture());
		assertThat(customerCaptor.getValue()).isSameAs(source);

		assertThat(sourceAuditLog.getCustomerId()).isEqualTo(1L);
		assertThat(sourceAuditLog.getOriginalCustomerId()).isEqualTo(2L);
		assertThat(sourceOverrideLog.getCustomerId()).isEqualTo(1L);
		assertThat(sourceOverrideLog.getOriginalCustomerId()).isEqualTo(2L);
	}

	@Test
	@DisplayName("TC-02: ho so bi gop dang co du lieu lien quan chua xu ly xong thi van gop va ghi vet nguon goc")
	void mergesEvenWhenSourceHasRelatedRecordsAndKeepsOriginTrace() {
		CustomerAuditLog sourceAuditLog = auditLogOf(2L);
		CustomerDuplicateOverrideLog unpaidLikeRecord = overrideLogOf(2L);
		when(auditLogRepository.findByCustomerIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(sourceAuditLog));
		when(overrideLogRepository.findByCustomerId(2L)).thenReturn(List.of(unpaidLikeRecord));

		service.merge(new CustomerMergeReq(1L, 2L));

		// Van gop thanh cong (khong nem loi) va giu duoc dau vet nguon goc cua tung ban ghi.
		assertThat(source.getStatus()).isEqualTo(CustomerStatus.MERGED);
		assertThat(unpaidLikeRecord.getOriginalCustomerId()).isEqualTo(2L);
		assertThat(unpaidLikeRecord.getCustomerId()).isEqualTo(1L);

		@SuppressWarnings("unchecked")
		ArgumentCaptor<List<CustomerDuplicateOverrideLog>> captor = ArgumentCaptor.forClass(List.class);
		verify(overrideLogRepository).saveAll(captor.capture());
		assertThat(captor.getValue()).containsExactly(unpaidLikeRecord);
	}

	@Test
	@DisplayName("TC-04: gop thanh cong thi ghi nhat ky chi tiet va nhat ky khach hang tren ho so giu lai")
	void recordsMergeLogAndCustomerAuditLog() {
		service.merge(new CustomerMergeReq(1L, 2L));

		ArgumentCaptor<CustomerMergeLog> mergeLogCaptor = ArgumentCaptor.forClass(CustomerMergeLog.class);
		verify(mergeLogRepository).save(mergeLogCaptor.capture());
		CustomerMergeLog mergeLog = mergeLogCaptor.getValue();
		assertThat(mergeLog.getSourceCustomerId()).isEqualTo(2L);
		assertThat(mergeLog.getSourceCustomerCode()).isEqualTo("KH-000002");
		assertThat(mergeLog.getTargetCustomerId()).isEqualTo(1L);
		assertThat(mergeLog.getTargetCustomerCode()).isEqualTo("KH-000001");
		assertThat(mergeLog.getPerformedByUserId()).isEqualTo(99L);
		assertThat(mergeLog.getPerformedByUsername()).isEqualTo("admin01");

		ArgumentCaptor<CustomerAuditLog> auditCaptor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(auditLogRepository).save(auditCaptor.capture());
		CustomerAuditLog auditLog = auditCaptor.getValue();
		assertThat(auditLog.getCustomerId()).isEqualTo(1L);
		assertThat(auditLog.getActionType()).isEqualTo(CustomerAuditAction.MERGE);
		assertThat(auditLog.getActorUserId()).isEqualTo(99L);
	}

	@Test
	@DisplayName("Khong the gop mot ho so voi chinh no")
	void rejectsMergingCustomerWithItself() {
		assertThatThrownBy(() -> service.merge(new CustomerMergeReq(1L, 1L)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(customerRepository, never()).save(any());
		verify(mergeLogRepository, never()).save(any());
	}

	@Test
	@DisplayName("Ho so bi gop da o trang thai da gop truoc do thi bi tu choi")
	void rejectsWhenSourceAlreadyMerged() {
		source.setStatus(CustomerStatus.MERGED);

		assertThatThrownBy(() -> service.merge(new CustomerMergeReq(1L, 2L)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);

		verify(customerRepository, never()).save(any());
	}

	@Test
	@DisplayName("Ho so giu lai da o trang thai da gop truoc do thi bi tu choi")
	void rejectsWhenTargetAlreadyMerged() {
		target.setStatus(CustomerStatus.MERGED);

		assertThatThrownBy(() -> service.merge(new CustomerMergeReq(1L, 2L)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.INVALID_STATE);
	}

	@Test
	@DisplayName("Khong tim thay ho so khach hang thi bao loi khong tim thay")
	void rejectsWhenCustomerNotFound() {
		when(customerRepository.findById(3L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.merge(new CustomerMergeReq(1L, 3L)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("Xem truoc: tra ve dung so ban ghi lien quan va khong lam thay doi du lieu")
	void previewReturnsCountsWithoutMutatingData() {
		when(auditLogRepository.findByCustomerIdOrderByCreatedAtDesc(2L)).thenReturn(List.of(auditLogOf(2L)));
		when(overrideLogRepository.findByCustomerId(2L)).thenReturn(List.of(overrideLogOf(2L), overrideLogOf(2L)));

		MergePreviewRes preview = service.preview(new CustomerMergeReq(1L, 2L));

		assertThat(preview.targetCustomer().id()).isEqualTo(1L);
		assertThat(preview.sourceCustomer().id()).isEqualTo(2L);
		assertThat(preview.relatedRecordCount()).isEqualTo(3L);

		assertThat(source.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
		verify(customerRepository, never()).save(any());
		verify(auditLogRepository, never()).saveAll(anyList());
		verify(overrideLogRepository, never()).saveAll(anyList());
		verify(mergeLogRepository, never()).save(any());
	}
}
