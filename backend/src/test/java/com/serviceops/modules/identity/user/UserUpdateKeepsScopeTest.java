package com.serviceops.modules.identity.user;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import com.serviceops.modules.identity.user.dto.request.UpdateUserReq;
import com.serviceops.modules.identity.user.dto.request.UserStatusReq;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.entity.UserRoleScope;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.RoleRepository;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.identity.user.service.impl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-01-CN-002 / NCL-01-CN-004: sua thong tin tai khoan (form "Sua tai khoan" khong gui pham vi) KHONG duoc am
 * tham doi pham vi du lieu ve toan cong ty; chi ghi nhat ky "Cau hinh phan quyen" khi vai tro/pham vi that su doi.
 */
@ExtendWith(MockitoExtension.class)
class UserUpdateKeepsScopeTest {

	@Mock private UserRepository userRepository;
	@Mock private UserRoleScopeRepository userRoleScopeRepository;
	@Mock private RoleRepository roleRepository;
	@Mock private DepartmentRepository departmentRepository;
	@Mock private PasswordEncoder passwordEncoder;
	@Mock private AuditLogService auditLogService;

	@InjectMocks private UserServiceImpl service;

	private User user;

	@BeforeEach
	void setUp() {
		user = new User();
		user.setId(7L);
		user.setUsername("pm.nhanh");
		user.setFullName("PM Nhanh");
		user.setDepartmentId(6L);
		user.setStatus(UserStatus.ACTIVE);

		Role pm = new Role();
		pm.setCode("VT-02");
		pm.setName("Quản lý dự án");
		UserRoleScope scope = new UserRoleScope();
		scope.setUser(user);
		scope.setRole(pm);
		scope.setScopeType("DEPARTMENT");
		scope.setScopeDepartmentId(6L);

		lenient().when(userRepository.findById(7L)).thenReturn(Optional.of(user));
		lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
		lenient().when(userRoleScopeRepository.findByUser_Id(7L)).thenReturn(List.of(scope));
		lenient().when(departmentRepository.existsById(anyLong())).thenReturn(true);
		lenient().when(roleRepository.findByCode("VT-02")).thenReturn(Optional.of(pm));
	}

	@Test
	@DisplayName("Sua ho ten, giu nguyen vai tro va khong gui pham vi -> khong dung toi phan quyen")
	void editingProfileKeepsDepartmentScope() {
		service.update(7L, new UpdateUserReq("PM Nhanh Moi", null, 6L, null, List.of("VT-02"), null, null));

		verify(userRoleScopeRepository, never()).deleteByUserId(anyLong());
		verify(auditLogService, never()).record(eq("Cấu hình phân quyền"), any(), any(), any(), any());
		verify(auditLogService).record(eq("Cập nhật tài khoản"), eq(AuditTargetType.USER), eq(7L), eq("pm.nhanh"), anyString());
		assertThat(user.getFullName()).isEqualTo("PM Nhanh Moi");
	}

	@Test
	@DisplayName("Doi pham vi sang toan cong ty -> thay phan quyen va ghi nhat ky phan quyen")
	void changingScopeIsRecorded() {
		service.update(7L, new UpdateUserReq("PM Nhanh", null, 6L, null, List.of("VT-02"), "COMPANY", null));

		verify(userRoleScopeRepository).deleteByUserId(7L);
		verify(auditLogService).record(eq("Cấu hình phân quyền"), eq(AuditTargetType.ROLE_SCOPE), eq(7L),
				eq("pm.nhanh"), anyString());
	}

	@Test
	@DisplayName("Quan tri vien dat lai mat khau -> cham dut cac phien dang mo")
	void adminPasswordResetRevokesSessions() {
		when(passwordEncoder.encode("MatKhauMoi@1")).thenReturn("hash");

		service.update(7L, new UpdateUserReq("PM Nhanh", null, 6L, "MatKhauMoi@1", null, null, null));

		assertThat(user.getTokenVersion()).isEqualTo(1);
	}

	@Test
	@DisplayName("TC-03: khoa tai khoan dang bi khoa -> bao ro da bi khoa")
	void lockingLockedAccountExplainsState() {
		user.setStatus(UserStatus.LOCKED);

		assertThatThrownBy(() -> service.updateStatus(7L, new UserStatusReq(UserStatus.LOCKED)))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessage("Tài khoản đã bị khóa.");
	}

	@Test
	@DisplayName("Gan bo phan khong ton tai -> tu choi")
	void rejectsUnknownDepartment() {
		when(departmentRepository.existsById(999L)).thenReturn(false);

		assertThatThrownBy(() -> service.update(7L, new UpdateUserReq("PM Nhanh", null, 999L, null, null, null, null)))
				.isInstanceOf(BusinessRuleException.class);
	}
}
