package com.serviceops.modules.project;

import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.TaskAssignment;
import com.serviceops.modules.project.repository.TaskAssignmentRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.security.ProjectDataScopeGuard;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/** NCL-01-CN-004 TC-01/TC-02: danh sach va chi tiet du an bi rang buoc theo pham vi du lieu. */
@ExtendWith(MockitoExtension.class)
class ProjectDataScopeGuardTest {

	@Mock private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock private UserRepository userRepository;
	@Mock private TaskRepository taskRepository;
	@Mock private TaskAssignmentRepository taskAssignmentRepository;

	private ProjectDataScopeGuard guard;

	private final Project inBranch = project(1L, 10L);
	private final Project otherBranch = project(2L, 20L);

	@BeforeEach
	void setUp() {
		guard = new ProjectDataScopeGuard(currentUserScopeProvider, userRepository, taskRepository, taskAssignmentRepository);
		lenient().when(currentUserScopeProvider.currentUserId()).thenReturn(99L);
		lenient().when(userRepository.findById(10L)).thenReturn(Optional.of(user(10L, 6L)));
		lenient().when(userRepository.findById(20L)).thenReturn(Optional.of(user(20L, 3L)));
	}

	@Test
	@DisplayName("TC-01: pham vi mot nhanh chi thay du an cua PM thuoc nhanh do")
	void departmentScopeOnlySeesProjectsOfBranch() {
		when(currentUserScopeProvider.currentScope()).thenReturn(new UserScope(DataScopeType.DEPARTMENT, Set.of(6L, 7L)));

		assertThat(guard.filterVisible(List.of(inBranch, otherBranch))).containsExactly(inBranch);
	}

	@Test
	@DisplayName("TC-02: mo du an ngoai pham vi bang duong dan truc tiep bi tu choi")
	void departmentScopeDeniesProjectOutsideBranch() {
		when(currentUserScopeProvider.currentScope()).thenReturn(new UserScope(DataScopeType.DEPARTMENT, Set.of(6L)));

		assertThatThrownBy(() -> guard.requireVisible(otherBranch)).isInstanceOf(AccessDeniedException.class);
		assertThatCode(() -> guard.requireVisible(inBranch)).doesNotThrowAnyException();
	}

	@Test
	@DisplayName("Pham vi toan cong ty thay moi du an")
	void companyScopeSeesEverything() {
		when(currentUserScopeProvider.currentScope()).thenReturn(UserScope.company());

		assertThat(guard.filterVisible(List.of(inBranch, otherBranch))).hasSize(2);
	}

	@Test
	@DisplayName("Pham vi ca nhan: du an minh la PM hoac duoc giao viec")
	void selfScopeSeesManagedOrAssignedProjects() {
		when(currentUserScopeProvider.currentScope()).thenReturn(new UserScope(DataScopeType.SELF, Set.of()));
		Project managed = project(3L, 99L);
		TaskAssignment assignment = new TaskAssignment();
		assignment.setTaskId(500L);
		assignment.setUserId(99L);
		Task task = new Task();
		task.setId(500L);
		task.setProjectId(2L);
		when(taskAssignmentRepository.findByUserIdOrderByIdAsc(99L)).thenReturn(List.of(assignment));
		when(taskRepository.findAllById(List.of(500L))).thenReturn(List.of(task));

		assertThat(guard.filterVisible(List.of(inBranch, otherBranch, managed))).containsExactly(otherBranch, managed);
	}

	private static Project project(Long id, Long managerId) {
		Project project = new Project();
		project.setId(id);
		project.setProjectManagerId(managerId);
		return project;
	}

	private static User user(Long id, Long departmentId) {
		User user = new User();
		user.setId(id);
		user.setDepartmentId(departmentId);
		return user;
	}
}
