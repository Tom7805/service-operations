package com.serviceops.modules.identity.department;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.identity.department.dto.request.DepartmentCreateReq;
import com.serviceops.modules.identity.department.dto.request.DepartmentMoveReq;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.department.enums.DepartmentType;
import com.serviceops.modules.identity.department.mapper.DepartmentMapper;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import com.serviceops.modules.identity.department.service.impl.DepartmentServiceImpl;
import com.serviceops.modules.identity.department.validator.DepartmentCycleValidator;
import com.serviceops.modules.identity.department.validator.DepartmentHierarchyValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** NCL-01-CN-003: moi thay doi cau truc to chuc deu de lai dau vet (TC-05); nguoi quan ly phai con hoat dong. */
@ExtendWith(MockitoExtension.class)
class DepartmentServiceAuditTest {

	@Mock private DepartmentRepository departmentRepository;
	@Mock private UserRepository userRepository;
	@Mock private DepartmentCycleValidator cycleValidator;
	@Mock private DepartmentHierarchyValidator hierarchyValidator;
	@Mock private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock private AuditLogService auditLogService;

	private DepartmentServiceImpl service;
	private User manager;
	private Department root;

	@BeforeEach
	void setUp() {
		service = new DepartmentServiceImpl(departmentRepository, userRepository, new DepartmentMapper(),
				cycleValidator, hierarchyValidator, currentUserScopeProvider, auditLogService);
		manager = new User();
		manager.setId(10L);
		manager.setUsername("truongphong");
		manager.setFullName("Truong Phong");
		manager.setStatus(UserStatus.ACTIVE);
		root = new Department();
		root.setId(1L);
		root.setName("Ban Giam Doc");
		root.setType(DepartmentType.BAN);

		lenient().when(userRepository.findById(10L)).thenReturn(Optional.of(manager));
		lenient().when(departmentRepository.findById(1L)).thenReturn(Optional.of(root));
		lenient().when(departmentRepository.findByParentId(any())).thenReturn(List.of());
		lenient().when(departmentRepository.save(any(Department.class))).thenAnswer(invocation -> {
			Department d = invocation.getArgument(0);
			if (d.getId() == null) {
				d.setId(50L);
			}
			return d;
		});
	}

	@Test
	@DisplayName("TC-05: tao bo phan con ghi nhat ky kem bo phan cha va nguoi quan ly")
	void createRecordsAuditLog() {
		service.create(new DepartmentCreateReq("Phong Du An", 1L, 10L, DepartmentType.PHONG));

		verify(auditLogService).record(eq("Tạo bộ phận"), eq(AuditTargetType.DEPARTMENT), eq(50L), eq("Phong Du An"),
				contains("Truong Phong"));
	}

	@Test
	@DisplayName("TC-05: di chuyen bo phan ghi nhat ky noi di va noi den")
	void moveRecordsAuditLog() {
		Department child = new Department();
		child.setId(2L);
		child.setName("Phong Ke Toan");
		child.setType(DepartmentType.PHONG);
		when(departmentRepository.findById(2L)).thenReturn(Optional.of(child));

		service.move(2L, new DepartmentMoveReq(1L));

		verify(auditLogService).record(eq("Di chuyển bộ phận"), eq(AuditTargetType.DEPARTMENT), eq(2L),
				eq("Phong Ke Toan"), contains("Ban Giam Doc"));
	}

	@Test
	@DisplayName("Nguoi quan ly da bi khoa tai khoan thi khong duoc gan")
	void rejectsLockedManager() {
		manager.setStatus(UserStatus.LOCKED);

		assertThatThrownBy(() -> service.create(new DepartmentCreateReq("Phong Moi", 1L, 10L, DepartmentType.PHONG)))
				.isInstanceOf(BusinessRuleException.class);
		verify(departmentRepository, never()).save(any());
	}
}
