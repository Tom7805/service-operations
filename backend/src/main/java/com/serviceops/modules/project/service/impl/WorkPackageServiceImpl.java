package com.serviceops.modules.project.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.project.dto.request.TaskCreateReq;
import com.serviceops.modules.project.dto.request.WorkPackageReq;
import com.serviceops.modules.project.dto.response.TaskAssignmentRes;
import com.serviceops.modules.project.dto.response.TaskRes;
import com.serviceops.modules.project.dto.response.WorkBreakdownRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.TaskAssignment;
import com.serviceops.modules.project.entity.WorkPackage;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskAssignmentRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import com.serviceops.modules.project.service.WorkPackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkPackageServiceImpl implements WorkPackageService {
	private final ProjectRepository projectRepository;
	private final WorkPackageRepository workPackageRepository;
	private final TaskRepository taskRepository;
	private final TaskAssignmentRepository assignmentRepository;
	private final UserRepository userRepository;

	@Override
	public WorkBreakdownRes createWorkPackage(Long projectId, WorkPackageReq request) {
		Project project = requireOpenProject(projectId);
		if (request.parentId() != null) {
			workPackageRepository.findById(request.parentId())
					.filter(item -> item.getProjectId().equals(projectId))
					.orElseThrow(() -> notFound("Khong tim thay hang muc cha thuoc du an"));
		}
		WorkPackage item = new WorkPackage();
		item.setProjectId(project.getId());
		item.setParentId(request.parentId());
		item.setName(request.name().trim());
		item.setDescription(blankToNull(request.description()));
		item.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
		item.setCreatedBy(currentUsername());
		item.setCreatedAt(LocalDateTime.now());
		return toResponse(workPackageRepository.save(item), List.of(), List.of());
	}

	@Override
	public TaskRes createTask(Long projectId, Long workPackageId, TaskCreateReq request) {
		Project project = requireOpenProject(projectId);
		WorkPackage workPackage = workPackageRepository.findById(workPackageId)
				.filter(item -> item.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay hang muc thuoc du an"));
		if (request.parentTaskId() != null) {
			taskRepository.findById(request.parentTaskId())
					.filter(item -> item.getProjectId().equals(projectId)
							&& item.getWorkPackageId().equals(workPackageId))
					.orElseThrow(() -> notFound("Khong tim thay cong viec cha thuoc hang muc"));
		}
		if (request.expectedStartDate() != null && request.expectedEndDate() != null
				&& request.expectedEndDate().isBefore(request.expectedStartDate())) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay ket thuc du kien khong duoc som hon ngay bat dau");
		}
		Task task = new Task();
		task.setProjectId(project.getId());
		task.setWorkPackageId(workPackage.getId());
		task.setParentTaskId(request.parentTaskId());
		task.setName(request.name().trim());
		task.setDescription(blankToNull(request.description()));
		task.setExpectedStartDate(request.expectedStartDate());
		task.setExpectedEndDate(request.expectedEndDate());
		task.setCreatedBy(currentUsername());
		task.setCreatedAt(LocalDateTime.now());
		return toTaskResponse(taskRepository.save(task), List.of());
	}

	@Override
	public void deleteWorkPackage(Long projectId, Long workPackageId) {
		requireOpenProject(projectId);
		WorkPackage item = workPackageRepository.findById(workPackageId)
				.filter(pack -> pack.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay hang muc thuoc du an"));
		if (!workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(projectId).stream()
				.filter(pack -> workPackageId.equals(pack.getParentId())).toList().isEmpty()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong the xoa hang muc dang chua hang muc con");
		}
		if (!taskRepository.findByProjectIdOrderByIdAsc(projectId).stream()
				.filter(task -> workPackageId.equals(task.getWorkPackageId())).toList().isEmpty()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong the xoa hang muc dang chua cong viec");
		}
		workPackageRepository.delete(item);
	}

	@Override
	@Transactional(readOnly = true)
	public List<WorkBreakdownRes> getWorkBreakdown(Long projectId) {
		requireProject(projectId);
		List<WorkPackage> packages = workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(projectId);
		List<Task> tasks = taskRepository.findByProjectIdOrderByIdAsc(projectId);
		List<Long> taskIds = tasks.stream().map(Task::getId).toList();
		List<TaskAssignment> assignments = assignmentRepository.findByTaskIdInOrderByIdAsc(taskIds);
		Map<Long, User> usersById = userRepository
				.findAllById(assignments.stream().map(TaskAssignment::getUserId).distinct().toList()).stream()
				.collect(Collectors.toMap(User::getId, user -> user));
		Map<Long, List<TaskAssignmentRes>> assignmentsByTask = assignments.stream()
				.map(assignment -> toAssignmentResponse(assignment, usersById.get(assignment.getUserId())))
				.filter(java.util.Objects::nonNull)
				.collect(Collectors.groupingBy(TaskAssignmentRes::taskId));
		Map<Long, List<TaskRes>> tasksByPackage = tasks.stream()
				.map(task -> toTaskResponse(task, assignmentsByTask.getOrDefault(task.getId(), List.of())))
				.collect(Collectors.groupingBy(TaskRes::workPackageId));
		Map<Long, List<WorkPackage>> childrenByParent = packages.stream()
				.filter(item -> item.getParentId() != null)
				.collect(Collectors.groupingBy(WorkPackage::getParentId));
		return packages.stream().filter(item -> item.getParentId() == null)
				.map(item -> toTree(item, childrenByParent, tasksByPackage)).toList();
	}

	private WorkBreakdownRes toTree(WorkPackage item, Map<Long, List<WorkPackage>> childrenByParent,
			Map<Long, List<TaskRes>> tasksByPackage) {
		List<WorkBreakdownRes> children = childrenByParent.getOrDefault(item.getId(), List.of()).stream()
				.map(child -> toTree(child, childrenByParent, tasksByPackage)).toList();
		return toResponse(item, tasksByPackage.getOrDefault(item.getId(), List.of()), children);
	}

	private Project requireOpenProject(Long projectId) {
		Project project = requireProject(projectId);
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Khong the thay doi cay cong viec cua du an da dong");
		}
		return project;
	}

	private Project requireProject(Long projectId) {
		return projectRepository.findById(projectId)
				.orElseThrow(() -> notFound("Khong tim thay du an"));
	}

	private BusinessRuleException notFound(String message) {
		return new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, message);
	}

	private WorkBreakdownRes toResponse(WorkPackage item, List<TaskRes> tasks, List<WorkBreakdownRes> children) {
		return new WorkBreakdownRes(item.getId(), item.getParentId(), item.getName(), item.getDescription(), tasks, children);
	}

	private TaskRes toTaskResponse(Task task, List<TaskAssignmentRes> assignments) {
		return new TaskRes(task.getId(), task.getProjectId(), task.getWorkPackageId(), task.getParentTaskId(),
				task.getName(), task.getDescription(), task.getExpectedStartDate(), task.getExpectedEndDate(),
				task.getStatus(), task.getBudgetHours(), assignments);
	}

	private TaskAssignmentRes toAssignmentResponse(TaskAssignment assignment, User user) {
		if (user == null) return null;
		return new TaskAssignmentRes(assignment.getId(), assignment.getTaskId(), user.getId(), user.getUsername(),
				user.getFullName(), assignment.getExpectedStartDate(), assignment.getExpectedEndDate());
	}

	private String blankToNull(String value) {
		if (value == null) return null;
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
