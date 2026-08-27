package com.serviceops.modules.customer;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.dto.request.CustomerContactReq;
import com.serviceops.modules.customer.dto.response.CustomerContactRes;
import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.entity.CustomerContact;
import com.serviceops.modules.customer.enums.ContactRole;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.mapper.CustomerContactMapper;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.modules.customer.repository.CustomerContactRepository;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.customer.service.impl.CustomerContactServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test CustomerContactServiceImpl - NCL-02-CN-003 (quan ly nguoi lien he
 * cua khach hang): TC-01 them nguoi lien he va danh dau dau moi chinh, TC-02
 * chi giu duy nhat mot dau moi chinh, TC-04 ghi nhat ky.
 */
@ExtendWith(MockitoExtension.class)
class CustomerContactServiceTest {

	@Mock
	private CustomerRepository customerRepository;

	@Mock
	private CustomerContactRepository customerContactRepository;

	@Mock
	private CustomerAuditLogRepository auditLogRepository;

	private final CustomerContactMapper customerContactMapper = new CustomerContactMapper();

	private CustomerContactServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new CustomerContactServiceImpl(customerRepository, customerContactRepository,
				customerContactMapper, auditLogRepository);

		lenient().when(customerRepository.existsById(anyLong())).thenReturn(true);
		lenient().when(customerContactRepository.save(any(CustomerContact.class))).thenAnswer(inv -> {
			CustomerContact contact = inv.getArgument(0);
			if (contact.getId() == null) {
				contact.setId(1L);
			}
			return contact;
		});
	}

	@Test
	@DisplayName("NCL-02-CN-003 TC-01: them nguoi lien he va danh dau la dau moi chinh thi luu thanh cong")
	void addsContactAndMarksPrimary() {
		when(customerContactRepository.findByCustomerIdAndRole(10L, ContactRole.PRIMARY))
				.thenReturn(Optional.empty());

		CustomerContactReq req = new CustomerContactReq("Nguyen Van A", "Giam doc mua hang",
				"a@congty.vn", "0901234567", true);

		CustomerContactRes result = service.addContact(10L, req);

		assertThat(result.fullName()).isEqualTo("Nguyen Van A");
		assertThat(result.isPrimary()).isTrue();
	}

	@Test
	@DisplayName("NCL-02-CN-003 TC-01: them nguoi lien he khong danh dau dau moi chinh thi la dau moi phu")
	void addsContactAsSecondaryByDefault() {
		CustomerContactRes result = service.addContact(10L,
				new CustomerContactReq("Nguyen Van B", null, null, null, false));

		assertThat(result.isPrimary()).isFalse();
		verify(customerContactRepository, never()).findByCustomerIdAndRole(any(), any());
	}

	@Test
	@DisplayName("NCL-02-CN-003 TC-02: khach hang da co dau moi chinh, them nguoi moi lam dau moi chinh thi chuyen nguoi cu thanh dau moi phu")
	void addingNewPrimaryDemotesExistingPrimary() {
		CustomerContact existingPrimary = new CustomerContact();
		existingPrimary.setId(1L);
		existingPrimary.setCustomerId(10L);
		existingPrimary.setFullName("Nguoi cu");
		existingPrimary.setRole(ContactRole.PRIMARY);

		when(customerContactRepository.findByCustomerIdAndRole(10L, ContactRole.PRIMARY))
				.thenReturn(Optional.of(existingPrimary));

		CustomerContactReq req = new CustomerContactReq("Nguoi moi", null, null, null, true);

		CustomerContactRes result = service.addContact(10L, req);

		assertThat(result.isPrimary()).isTrue();
		assertThat(existingPrimary.getRole()).isEqualTo(ContactRole.SECONDARY);
		verify(customerContactRepository, times(2)).save(any(CustomerContact.class));
	}

	@Test
	@DisplayName("NCL-02-CN-003 TC-02: danh dau mot nguoi lien he da co san la dau moi chinh thi chuyen dau moi chinh cu thanh dau moi phu")
	void setPrimaryOnExistingContactDemotesCurrentPrimary() {
		CustomerContact existingPrimary = new CustomerContact();
		existingPrimary.setId(1L);
		existingPrimary.setCustomerId(10L);
		existingPrimary.setRole(ContactRole.PRIMARY);

		CustomerContact secondContact = new CustomerContact();
		secondContact.setId(2L);
		secondContact.setCustomerId(10L);
		secondContact.setFullName("Nguoi thu hai");
		secondContact.setRole(ContactRole.SECONDARY);

		when(customerContactRepository.findById(2L)).thenReturn(Optional.of(secondContact));
		when(customerContactRepository.findByCustomerIdAndRole(10L, ContactRole.PRIMARY))
				.thenReturn(Optional.of(existingPrimary));

		CustomerContactRes result = service.setPrimary(10L, 2L);

		assertThat(result.isPrimary()).isTrue();
		assertThat(existingPrimary.getRole()).isEqualTo(ContactRole.SECONDARY);
	}

	@Test
	@DisplayName("Dat lai dau moi chinh cho chinh nguoi dang la dau moi chinh thi khong doi ai khac")
	void setPrimaryOnAlreadyPrimaryContactIsIdempotent() {
		CustomerContact alreadyPrimary = new CustomerContact();
		alreadyPrimary.setId(1L);
		alreadyPrimary.setCustomerId(10L);
		alreadyPrimary.setFullName("Dang la chinh");
		alreadyPrimary.setRole(ContactRole.PRIMARY);

		when(customerContactRepository.findById(1L)).thenReturn(Optional.of(alreadyPrimary));
		when(customerContactRepository.findByCustomerIdAndRole(10L, ContactRole.PRIMARY))
				.thenReturn(Optional.of(alreadyPrimary));

		CustomerContactRes result = service.setPrimary(10L, 1L);

		assertThat(result.isPrimary()).isTrue();
		verify(customerContactRepository, times(1)).save(any(CustomerContact.class));
	}

	@Test
	@DisplayName("Khong tim thay khach hang thi bao loi va khong luu")
	void rejectsWhenCustomerNotFound() {
		when(customerRepository.existsById(99L)).thenReturn(false);
		CustomerContactReq req = new CustomerContactReq("Nguyen Van A", null, null, null, false);

		assertThatThrownBy(() -> service.addContact(99L, req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);

		verify(customerContactRepository, never()).save(any());
	}

	@Test
	@DisplayName("Nguoi lien he thuoc khach hang khac thi bao khong tim thay khi dat dau moi chinh")
	void rejectsSetPrimaryForContactOfDifferentCustomer() {
		CustomerContact contactOfAnotherCustomer = new CustomerContact();
		contactOfAnotherCustomer.setId(5L);
		contactOfAnotherCustomer.setCustomerId(20L);

		when(customerContactRepository.findById(5L)).thenReturn(Optional.of(contactOfAnotherCustomer));

		assertThatThrownBy(() -> service.setPrimary(10L, 5L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
	}

	@Test
	@DisplayName("Chua nhap ho ten thi bao loi va khong luu")
	void rejectsBlankFullName() {
		CustomerContactReq req = new CustomerContactReq("   ", null, null, null, false);

		assertThatThrownBy(() -> service.addContact(10L, req))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.VALIDATION_ERROR);

		verify(customerContactRepository, never()).save(any());
	}

	@Test
	@DisplayName("NCL-02-CN-003 TC-04: them nguoi lien he thanh cong thi ghi nhat ky CONTACT_ADD")
	void recordsAuditLogOnAddContact() {
		service.addContact(10L, new CustomerContactReq("Nguyen Van A", null, null, null, false));

		ArgumentCaptor<CustomerAuditLog> captor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(auditLogRepository).save(captor.capture());
		assertThat(captor.getValue().getActionType()).isEqualTo(CustomerAuditAction.CONTACT_ADD);
		assertThat(captor.getValue().getCustomerId()).isEqualTo(10L);
	}

	@Test
	@DisplayName("NCL-02-CN-003 TC-04: dat dau moi chinh thanh cong thi ghi nhat ky CONTACT_SET_PRIMARY")
	void recordsAuditLogOnSetPrimary() {
		CustomerContact contact = new CustomerContact();
		contact.setId(2L);
		contact.setCustomerId(10L);
		contact.setFullName("Nguoi thu hai");
		contact.setRole(ContactRole.SECONDARY);
		when(customerContactRepository.findById(2L)).thenReturn(Optional.of(contact));
		when(customerContactRepository.findByCustomerIdAndRole(10L, ContactRole.PRIMARY))
				.thenReturn(Optional.empty());

		service.setPrimary(10L, 2L);

		ArgumentCaptor<CustomerAuditLog> captor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(auditLogRepository).save(captor.capture());
		assertThat(captor.getValue().getActionType()).isEqualTo(CustomerAuditAction.CONTACT_SET_PRIMARY);
	}

	@Test
	@DisplayName("Danh sach nguoi lien he: dau moi chinh hien o dau danh sach")
	void listOrdersPrimaryFirst() {
		CustomerContact secondary = new CustomerContact();
		secondary.setId(1L);
		secondary.setCustomerId(10L);
		secondary.setFullName("Phu");
		secondary.setRole(ContactRole.SECONDARY);
		secondary.setCreatedAt(LocalDateTime.now().minusDays(1));

		CustomerContact primary = new CustomerContact();
		primary.setId(2L);
		primary.setCustomerId(10L);
		primary.setFullName("Chinh");
		primary.setRole(ContactRole.PRIMARY);
		primary.setCreatedAt(LocalDateTime.now());

		when(customerContactRepository.findByCustomerId(10L)).thenReturn(List.of(secondary, primary));

		List<CustomerContactRes> result = service.listByCustomer(10L);

		assertThat(result).hasSize(2);
		assertThat(result.get(0).fullName()).isEqualTo("Chinh");
		assertThat(result.get(0).isPrimary()).isTrue();
	}
}
