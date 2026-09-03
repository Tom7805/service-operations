package com.serviceops.modules.customer;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.DuplicateOverrideReq;
import com.serviceops.modules.customer.dto.request.CustomerSearchReq;
import com.serviceops.modules.customer.dto.request.CustomerSegmentReq;
import com.serviceops.modules.customer.dto.request.CustomerUpdateReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.entity.CustomerDuplicateOverrideLog;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.enums.CustomerStatus;
import com.serviceops.modules.customer.mapper.CustomerMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerDuplicateOverrideLogRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.CustomerDuplicateService;
import com.serviceops.modules.customer.service.impl.CustomerServiceImpl;
import com.serviceops.modules.customer.validator.CustomerDuplicateValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;
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

	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;

	@Mock
	private UserRepository userRepository;

	private final CustomerMapper customerMapper = new CustomerMapper();

	private final CustomerDuplicateValidator customerDuplicateValidator = new CustomerDuplicateValidator();

	private CustomerServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new CustomerServiceImpl(customerRepository, customerMapper, customerDuplicateService,
				overrideLogRepository, auditLogRepository, customerDuplicateValidator,
				currentUserScopeProvider, userRepository);

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
		// Mac dinh COMPANY-wide (khong gioi han) — cac test cu trong file nay
		// kiem tra hanh vi khong lien quan pham vi du lieu, khong nen bi anh
		// huong boi bo loc scope moi them (QTN-01). Cac test rieng cho SELF/
		// DEPARTMENT ben duoi tu stub lai gia tri khac.
		lenient().when(currentUserScopeProvider.currentScope()).thenReturn(UserScope.company());
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

	@Test
	@DisplayName("NCL-02-CN-005 TC-02: loc theo nhom khong co khach hang nao -> tra ve rong")
	void filterBySegmentReturnsEmptyWhenNoMatch() {
		Customer c1 = new Customer();
		c1.setIndustry("Cong nghe");
		c1.setCompanySize("Vua");
		c1.setPriority("Cao");
		Customer c2 = new Customer();
		c2.setIndustry("Tai chinh");
		c2.setCompanySize("Lon");
		c2.setPriority("Thap");
		when(customerRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(c1, c2));

		CustomerSearchReq request = new CustomerSearchReq();
		request.setCompanySize("Sieu nho");

		assertThat(service.findAll(request)).isEmpty();
	}

	/**
	 * QTN-01: cac test nay bat dung lai loi phat hien qua kiem thu thu cong
	 * TC-02 (bien ban "Kich Ban Kiem Thu Van Hanh") — sale.lead va sale01
	 * thay giong het nhau vi CustomerServiceImpl.findAll() truoc day tra ve
	 * TOAN BO danh sach cho MOI pham vi, khong loc theo DEPARTMENT/SELF.
	 */
	@Test
	@DisplayName("QTN-01: pham vi SELF chi thay ho so do chinh minh phu trach")
	void selfScopeOnlyShowsOwnCustomers() {
		Customer own = new Customer();
		own.setOwnerId(10L);
		Customer someoneElses = new Customer();
		someoneElses.setOwnerId(20L);
		when(customerRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(own, someoneElses));
		when(currentUserScopeProvider.currentScope()).thenReturn(new UserScope(DataScopeType.SELF, java.util.Set.of()));
		when(currentUserScopeProvider.currentUserId()).thenReturn(10L);

		assertThat(service.findAll(null)).hasSize(1);
	}

	@Test
	@DisplayName("QTN-01: pham vi DEPARTMENT thay ho so cua nguoi phu trach cung phong, khong thay phong khac")
	void departmentScopeOnlyShowsSameDepartmentOwners() {
		Customer sameDept = new Customer();
		sameDept.setOwnerId(11L);
		Customer otherDept = new Customer();
		otherDept.setOwnerId(21L);
		when(customerRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(sameDept, otherDept));
		when(currentUserScopeProvider.currentScope())
				.thenReturn(new UserScope(DataScopeType.DEPARTMENT, java.util.Set.of(3L)));

		User ownerInScope = new User();
		ownerInScope.setId(11L);
		ownerInScope.setDepartmentId(3L);
		User ownerOutOfScope = new User();
		ownerOutOfScope.setId(21L);
		ownerOutOfScope.setDepartmentId(99L);
		when(userRepository.findById(11L)).thenReturn(java.util.Optional.of(ownerInScope));
		when(userRepository.findById(21L)).thenReturn(java.util.Optional.of(ownerOutOfScope));

		assertThat(service.findAll(null)).hasSize(1);
	}

	@Test
	@DisplayName("QTN-01: ho so khong xac dinh nguoi phu trach bi loai khoi ket qua khi pham vi khong phai COMPANY")
	void customerWithoutOwnerIsHiddenOutsideCompanyScope() {
		Customer noOwner = new Customer();
		noOwner.setOwnerId(null);
		when(customerRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(noOwner));
		when(currentUserScopeProvider.currentScope()).thenReturn(new UserScope(DataScopeType.SELF, java.util.Set.of()));

		assertThat(service.findAll(null)).isEmpty();
	}

	@Test
	@DisplayName("NCL-02-CN-001: tao ho so thi gan nguoi tao lam nguoi phu trach (ownerId)")
	void createSetsOwnerIdToCurrentUser() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(42L);

		service.create(new CustomerCreateReq("Cong ty TNHH ABC", null, null, null, null));

		ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
		verify(customerRepository).save(captor.capture());
		assertThat(captor.getValue().getOwnerId()).isEqualTo(42L);
	}

	// --- Chinh sua ho so khach hang (PUT /customers/{id}) ---

	private Customer existingCustomer(long id) {
		Customer customer = new Customer();
		customer.setId(id);
		customer.setCode("KH-000123");
		customer.setName("Cong ty cu");
		customer.setStatus(CustomerStatus.ACTIVE);
		return customer;
	}

	@Test
	@DisplayName("Update: sua duoc ten/MST/SDT/nganh/dia chi va ghi nhat ky UPDATE")
	void updatesEditableFieldsAndRecordsAudit() {
		when(customerRepository.findById(123L)).thenReturn(java.util.Optional.of(existingCustomer(123L)));
		CustomerUpdateReq req = new CustomerUpdateReq("Cong ty moi", "0101234567", "0987654321",
				"Logistics", "Da Nang");

		CustomerRes result = service.update(123L, req);

		assertThat(result.name()).isEqualTo("Cong ty moi");
		assertThat(result.taxCode()).isEqualTo("0101234567");
		assertThat(result.phone()).isEqualTo("0987654321");

		ArgumentCaptor<CustomerAuditLog> captor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(auditLogRepository).save(captor.capture());
		assertThat(captor.getValue().getActionType()).isEqualTo(CustomerAuditAction.UPDATE);
	}

	@Test
	@DisplayName("Update: khong tim thay ho so thi bao RESOURCE_NOT_FOUND")
	void rejectsUpdateWhenCustomerMissing() {
		when(customerRepository.findById(999L)).thenReturn(java.util.Optional.empty());

		assertThatThrownBy(() -> service.update(999L,
				new CustomerUpdateReq("Cong ty moi", null, null, null, null)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
		verify(customerRepository, never()).save(any());
	}

	@Test
	@DisplayName("Update: ho so da bi gop (MERGED) thi khong cho sua")
	void rejectsUpdateWhenCustomerMerged() {
		Customer merged = existingCustomer(123L);
		merged.setStatus(CustomerStatus.MERGED);
		when(customerRepository.findById(123L)).thenReturn(java.util.Optional.of(merged));

		assertThatThrownBy(() -> service.update(123L,
				new CustomerUpdateReq("Cong ty moi", null, null, null, null)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);
		verify(customerRepository, never()).save(any());
	}

	@Test
	@DisplayName("Update: chan luu khi trung ho so KHAC (giong cao), nhung bo qua chinh no")
	void updateBlocksOnDuplicateButIgnoresSelf() {
		when(customerRepository.findById(123L)).thenReturn(java.util.Optional.of(existingCustomer(123L)));
		// Ket qua nghi trung gom chinh no (id=123, bi loai) va mot ho so khac giong cao (id=456).
		when(customerDuplicateService.findDuplicates(anyString(), any(), any())).thenReturn(List.of(
				new DuplicateCandidateRes(123L, "KH-000123", "Cong ty moi", null, null, 1.0, List.of("ten")),
				new DuplicateCandidateRes(456L, "KH-000456", "Cong ty moi", null, null, 0.95, List.of("ten"))));

		assertThatThrownBy(() -> service.update(123L,
				new CustomerUpdateReq("Cong ty moi", null, null, null, null)))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.DUPLICATE_DATA);
		verify(customerRepository, never()).save(any());
	}

	@Test
	@DisplayName("Update: chi nghi trung voi CHINH minh thi van luu binh thuong")
	void updateAllowsWhenOnlySelfMatches() {
		when(customerRepository.findById(123L)).thenReturn(java.util.Optional.of(existingCustomer(123L)));
		when(customerDuplicateService.findDuplicates(anyString(), any(), any())).thenReturn(List.of(
				new DuplicateCandidateRes(123L, "KH-000123", "Cong ty moi", null, null, 1.0, List.of("ten"))));

		CustomerRes result = service.update(123L,
				new CustomerUpdateReq("Cong ty moi", null, null, null, null));

		assertThat(result.name()).isEqualTo("Cong ty moi");
		verify(customerRepository).save(any(Customer.class));
	}

	@Test
	@DisplayName("UpdateWithOverride: ghi log ly do va nhat ky UPDATE_WITH_OVERRIDE, khong chan trung")
	void updateWithOverrideSkipsBlockingAndLogsReason() {
		when(customerRepository.findById(123L)).thenReturn(java.util.Optional.of(existingCustomer(123L)));

		CustomerRes result = service.updateWithOverride(123L,
				new CustomerUpdateReq("Cong ty moi", null, null, null, null),
				new DuplicateOverrideReq("Hai phap nhan doc lap"));

		assertThat(result.name()).isEqualTo("Cong ty moi");

		ArgumentCaptor<CustomerDuplicateOverrideLog> overrideCaptor =
				ArgumentCaptor.forClass(CustomerDuplicateOverrideLog.class);
		verify(overrideLogRepository).save(overrideCaptor.capture());
		assertThat(overrideCaptor.getValue().getReason()).isEqualTo("Hai phap nhan doc lap");

		ArgumentCaptor<CustomerAuditLog> auditCaptor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(auditLogRepository).save(auditCaptor.capture());
		assertThat(auditCaptor.getValue().getActionType())
				.isEqualTo(CustomerAuditAction.UPDATE_WITH_OVERRIDE);
	}
}
