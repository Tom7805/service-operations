package com.serviceops.modules.opportunity;

import com.serviceops.modules.opportunity.entity.OpportunityAuditLog;
import com.serviceops.modules.opportunity.enums.OpportunityAuditAction;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.repository.OpportunityAuditLogRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
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
 * Unit test OpportunityAuditLogger - ghi nhat ky tao co hoi (TC-04) va nhat ky
 * tu choi truy cap (TC-03), NCL-03-CN-001.
 */
@ExtendWith(MockitoExtension.class)
class OpportunityAuditLoggerTest {

	@Mock
	private OpportunityAuditLogRepository repository;

	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;

	private OpportunityAuditLogger logger;

	@BeforeEach
	void setUp() {
		logger = new OpportunityAuditLogger(repository, currentUserScopeProvider);
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("TC-04: tao co hoi thanh cong thi ghi nhat ky CREATE gan voi id co hoi, nguoi thuc hien va thoi diem")
	void recordsCreateWithOpportunityId() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);
		SecurityContextHolder.getContext().setAuthentication(
				new TestingAuthenticationToken("sale01", null));

		logger.recordCreate(100L, "Tao co hoi ban hang: Trien khai ERP");

		ArgumentCaptor<OpportunityAuditLog> captor = ArgumentCaptor.forClass(OpportunityAuditLog.class);
		verify(repository).save(captor.capture());
		OpportunityAuditLog saved = captor.getValue();
		assertThat(saved.getOpportunityId()).isEqualTo(100L);
		assertThat(saved.getActionType()).isEqualTo(OpportunityAuditAction.CREATE);
		assertThat(saved.getActorId()).isEqualTo(7L);
		assertThat(saved.getActorUsername()).isEqualTo("sale01");
		assertThat(saved.getCreatedAt()).isNotNull();
	}

	@Test
	@DisplayName("TC-03: tu choi truy cap thi ghi nhat ky DENIED_ACCESS, khong gan voi co hoi nao")
	void logsDeniedAccessWithoutOpportunity() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(42L);
		SecurityContextHolder.getContext().setAuthentication(
				new TestingAuthenticationToken("nhanvien03", null));

		logger.logDeniedAccess("OpportunityController.create()", "Tu choi truy cap chuc nang co hoi ban hang");

		ArgumentCaptor<OpportunityAuditLog> captor = ArgumentCaptor.forClass(OpportunityAuditLog.class);
		verify(repository).save(captor.capture());
		OpportunityAuditLog saved = captor.getValue();
		assertThat(saved.getOpportunityId()).isNull();
		assertThat(saved.getActionType()).isEqualTo(OpportunityAuditAction.DENIED_ACCESS);
		assertThat(saved.getActorId()).isEqualTo(42L);
	}

	@Test
	@DisplayName("Chua xac thuc thi van ghi duoc nhat ky tu choi, actorId mac dinh 0")
	void logsDeniedAccessWithoutAuthentication() {
		SecurityContextHolder.clearContext();

		assertThatCode(() -> logger.logDeniedAccess("OpportunityController.create()", "Chua dang nhap"))
				.doesNotThrowAnyException();

		ArgumentCaptor<OpportunityAuditLog> captor = ArgumentCaptor.forClass(OpportunityAuditLog.class);
		verify(repository).save(captor.capture());
		assertThat(captor.getValue().getActorId()).isEqualTo(0L);
	}
}
