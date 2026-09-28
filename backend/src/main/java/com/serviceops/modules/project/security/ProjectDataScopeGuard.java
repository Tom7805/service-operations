package com.serviceops.modules.project.security;

import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.TaskAssignment;
import com.serviceops.modules.project.repository.TaskAssignmentRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import com.serviceops.security.scope.DataScopeType;
import com.serviceops.security.scope.UserScope;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Pham vi du lieu cua du an theo vai tro va cay to chuc (QTN-01, NCL-01-CN-004 TC-01/TC-02).
 *
 * <ul>
 *   <li><b>COMPANY</b>: thay moi du an.</li>
 *   <li><b>DEPARTMENT</b>: du an ma Quan ly du an phu trach thuoc nhanh to chuc duoc phan (bo phan cua
 *       du an suy ra tu {@code users.department_id} cua PM tai thoi diem xem — doi phong ban la ap dung
 *       ngay, khong luu lap).</li>
 *   <li><b>SELF</b>: du an minh lam Quan ly du an, hoac du an minh duoc giao it nhat mot cong viec.</li>
 * </ul>
 *
 * <p>Truy cap chi tiet mot du an ngoai pham vi nem {@link AccessDeniedException} de
 * {@code GlobalExceptionHandler} tra 403 va ghi nhat ky lan tu choi.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ProjectDataScopeGuard {

	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final UserRepository userRepository;
	private final TaskRepository taskRepository;
	private final TaskAssignmentRepository taskAssignmentRepository;

	/** Loc danh sach du an con lai trong pham vi cua nguoi dang dang nhap. */
	public List<Project> filterVisible(Collection<Project> projects) {
		return projects.stream().filter(visibility()).toList();
	}

	/** Chan truy cap chi tiet du an ngoai pham vi (truy cap bang duong dan truc tiep — TC-02). */
	public void requireVisible(Project project) {
		if (!visibility().test(project)) {
			log.warn("ACCESS_DENIED userId={} projectId={} reason=OUT_OF_SCOPE",
					currentUserScopeProvider.currentUserId(), project.getId());
			throw new AccessDeniedException("Du an nam ngoai pham vi du lieu cua nguoi dung");
		}
	}

	private Predicate<Project> visibility() {
		UserScope scope = currentUserScopeProvider.currentScope();
		if (scope.isCompanyWide()) {
			return project -> true;
		}
		Long userId = currentUserScopeProvider.currentUserId();
		if (userId == null) {
			return project -> false;
		}
		if (scope.type() == DataScopeType.DEPARTMENT) {
			Map<Long, Long> departmentByManager = new HashMap<>();
			return project -> {
				Long managerId = project.getProjectManagerId();
				if (userId.equals(managerId)) {
					return true;
				}
				Long departmentId = departmentByManager.computeIfAbsent(managerId, this::departmentOf);
				return scope.allowsDepartment(departmentId);
			};
		}
		Set<Long> assignedProjectIds = assignedProjectIds(userId);
		return project -> userId.equals(project.getProjectManagerId()) || assignedProjectIds.contains(project.getId());
	}

	private Long departmentOf(Long userId) {
		if (userId == null) {
			return null;
		}
		return userRepository.findById(userId).map(User::getDepartmentId).orElse(null);
	}

	private Set<Long> assignedProjectIds(Long userId) {
		List<Long> taskIds = taskAssignmentRepository.findByUserIdOrderByIdAsc(userId).stream()
				.map(TaskAssignment::getTaskId)
				.toList();
		if (taskIds.isEmpty()) {
			return Set.of();
		}
		return taskRepository.findAllById(taskIds).stream()
				.map(Task::getProjectId)
				.collect(Collectors.toSet());
	}
}
