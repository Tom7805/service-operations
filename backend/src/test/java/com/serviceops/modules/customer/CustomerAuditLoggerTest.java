package com.serviceops.modules.customer;

import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.logging.CustomerAuditLogger;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test CustomerAuditLogger - ghi nhat ky lan tu choi truy cap (NCL-02-CN-002, TC-04, TC-05).
 */
@ExtendWith(MockitoExtension.class)
class CustomerAuditLoggerTest {

	@Mock
	private CustomerAuditLogRepository repository;

	@Mock
	private CustomUserDetails userDetails;

	private CustomerAuditLogger logger;

	@BeforeEach
	void setUp() {
		logger = new CustomerAuditLogger(repository);
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("TC-04/TC-05: nguoi dung sai vai tro bi tu choi thi ghi lai nguoi thuc hien, noi dung va thoi diem")
	void logsDeniedAccessWithActor() {
		when(userDetails.getId()).thenReturn(42L);
		when(userDetails.getUsername()).thenReturn("nhanvien03");
		SecurityContextHolder.getContext().setAuthentication(
				new TestingAuthenticationToken(userDetails, null));

		logger.logDeniedAccess("CustomerController.checkDuplicate()", "Tu choi truy cap chuc nang khach hang");

		ArgumentCaptor<CustomerAuditLog> captor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(repository).save(captor.capture());
		CustomerAuditLog saved = captor.getValue();
		assertThat(saved.getActionType()).isEqualTo(CustomerAuditAction.DENIED_ACCESS);
		assertThat(saved.getActorUserId()).isEqualTo(42L);
		assertThat(saved.getActorUsername()).isEqualTo("nhanvien03");
		assertThat(saved.getCreatedAt()).isNotNull();
	}

	@Test
	@DisplayName("Request chua xac thuc (khong co JWT) van ghi duoc nhat ky, actor de trong")
	void logsDeniedAccessWithoutAuthentication() {
		SecurityContextHolder.clearContext();

		assertThatCode(() -> logger.logDeniedAccess("CustomerController.create()", "Chua dang nhap"))
				.doesNotThrowAnyException();

		ArgumentCaptor<CustomerAuditLog> captor = ArgumentCaptor.forClass(CustomerAuditLog.class);
		verify(repository).save(captor.capture());
		assertThat(captor.getValue().getActorUserId()).isNull();
	}
}
