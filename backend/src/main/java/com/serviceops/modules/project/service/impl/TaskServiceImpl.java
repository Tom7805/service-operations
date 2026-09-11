package com.serviceops.modules.project.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.project.dto.request.TaskAssignmentReq;
import com.serviceops.modules.project.dto.request.TaskProgressReq;
import com.serviceops.modules.project.dto.response.TaskAssignmentRes;
import com.serviceops.modules.project.dto.response.TaskRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.TaskAssignment;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskAssignmentRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.TaskService;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskServiceImpl implements TaskService {
	private final ProjectRepository projectRepository;
	private final TaskRepository taskRepository;
	private final TaskAssignmentRepository assignmentRepository;
	private final EmployeeRepository employeeRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final ProjectAuditLogger auditLogger;

	@Override
	public List<TaskAssignmentRes> assign(Long projectId, Long taskId, TaskAssignmentReq request) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> notFound("Khong tim thay du an"));
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong the giao viec cho du an da dong");
		}
		Task task = taskRepository.findById(taskId)
				.filter(item -> item.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay cong viec thuoc du an"));
		if (request.expectedStartDate() != null && request.expectedEndDate() != null
				&& request.expectedEndDate().isBefore(request.expectedStartDate())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay ket thuc du kien khong duoc som hon ngay bat dau");
		}
		if (new HashSet<>(request.userIds()).size() != request.userIds().size()) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
					"Danh sach nguoi duoc giao khong duoc trung");
		}

		List<User> users = request.userIds().stream().map(this::requireAssignableUser).toList();
		assignmentRepository.deleteByTaskId(task.getId());
		List<TaskAssignment> assignments = users.stream().map(user -> {
			TaskAssignment assignment = new TaskAssignment();
			assignment.setTaskId(task.getId());
			assignment.setUserId(user.getId());
			assignment.setExpectedStartDate(request.expectedStartDate());
			assignment.setExpectedEndDate(request.expectedEndDate());
			assignment.setCreatedBy(currentUsername());
			assignment.setCreatedAt(LocalDateTime.now());
			return assignment;
		}).toList();
		return assignmentRepository.saveAll(assignments).stream().map(this::toResponse).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<TaskAssignmentRes> findAssignments(Long projectId, Long taskId) {
		projectRepository.findById(projectId)
				.orElseThrow(() -> notFound("Khong tim thay du an"));
		taskRepository.findById(taskId)
				.filter(item -> item.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay cong viec thuoc du an"));
		return assignmentRepository.findByTaskIdOrderByIdAsc(taskId).stream().map(this::toResponse).toList();
	}

	@Override
	public TaskRes updateProgress(Long projectId, Long taskId, TaskProgressReq request) {
		Project project = projectRepository.findById(projectId).orElseThrow(() -> notFound("Khong tim thay du an"));
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong the cap nhat tien do cong viec cua du an da dong");
		}
		Task task = taskRepository.findById(taskId)
				.filter(item -> item.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay cong viec thuoc du an"));

		Long currentUserId = currentUserScopeProvider.currentUserId();
		if (currentUserId == null || !assignmentRepository.existsByTaskIdAndUserId(task.getId(), currentUserId)) {
			throw new AccessDeniedException("Ban khong phai nguoi duoc giao cong viec nay");
		}

		TaskStatus previousStatus = task.getStatus();
		task.setStatus(request.status());
		Task saved = taskRepository.save(task);

		auditLogger.recordProgressUpdate(projectId, saved.getId(), previousStatus, saved.getStatus());

		return toResponse(saved);
	}

	private TaskRes toResponse(Task task) {
		return new TaskRes(task.getId(), task.getProjectId(), task.getWorkPackageId(), task.getParentTaskId(),
				task.getName(), task.getDescription(), task.getExpectedStartDate(), task.getExpectedEndDate(),
				task.getStatus());
	}

	private User requireAssignableUser(Long userId) {
		Employee employee = employeeRepository.findByUser_Id(userId)
				.orElseThrow(() -> notFound("Khong tim thay ho so nhan su voi userId=" + userId));
		User user = employee.getUser();
		if (user.getStatus() != UserStatus.ACTIVE
				|| employee.getEndDate() != null && employee.getEndDate().isBefore(LocalDate.now())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong the giao viec cho nhan su da ket thuc hop dong");
		}
		return user;
	}

	private TaskAssignmentRes toResponse(TaskAssignment assignment) {
		User user = requireAssignableUser(assignment.getUserId());
		return new TaskAssignmentRes(assignment.getId(), assignment.getTaskId(), user.getId(), user.getUsername(),
				user.getFullName(), assignment.getExpectedStartDate(), assignment.getExpectedEndDate());
	}

	private BusinessRuleException notFound(String message) {
		return new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, message);
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
