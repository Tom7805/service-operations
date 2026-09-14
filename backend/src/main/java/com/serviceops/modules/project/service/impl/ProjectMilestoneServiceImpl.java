package com.serviceops.modules.project.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.dto.request.ProjectMilestoneCompleteReq;
import com.serviceops.modules.project.dto.request.ProjectMilestoneReq;
import com.serviceops.modules.project.dto.response.ProjectMilestoneRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.ProjectMilestone;
import com.serviceops.modules.project.entity.ProjectMilestoneItem;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.MilestoneProgressStatus;
import com.serviceops.modules.project.enums.ProjectAuditAction;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectMilestoneItemRepository;
import com.serviceops.modules.project.repository.ProjectMilestoneRepository;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.repository.WorkPackageRepository;
import com.serviceops.modules.project.service.ProjectMilestoneService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * NCL-05-CN-008: quan ly moc tien do cua du an.
 *
 * <p>Quy tac:</p>
 * <ul>
 *   <li>Dieu kien bat dau: du an phai dang chay va da co cay cong viec (it nhat mot hang muc).</li>
 *   <li>Hang muc phai hoan thanh cua moc la lien ket sang cong viec (Task) thuoc du an.</li>
 *   <li>TC-02: trang thai tinh DONG khi doc — DONE khi da co ngay thuc te; LATE khi da qua
 *       ngay ke hoach ma chua hoan thanh (kem so ngay tre); con lai ON_TRACK. Dung
 *       {@link Clock} de dong ho co the gia lap trong test.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ProjectMilestoneServiceImpl implements ProjectMilestoneService {

	private final ProjectRepository projectRepository;
	private final WorkPackageRepository workPackageRepository;
	private final TaskRepository taskRepository;
	private final ProjectMilestoneRepository milestoneRepository;
	private final ProjectMilestoneItemRepository milestoneItemRepository;
	private final ProjectAuditLogger auditLogger;
	private final Clock clock;

	@Override
	public ProjectMilestoneRes createMilestone(Long projectId, ProjectMilestoneReq request) {
		Project project = requireOpenProject(projectId);
		requireWorkBreakdown(projectId);
		ProjectMilestone milestone = new ProjectMilestone();
		milestone.setProjectId(project.getId());
		applyRequest(milestone, request);
		milestone.setCreatedBy(currentUsername());
		LocalDateTime now = LocalDateTime.now(clock);
		milestone.setCreatedAt(now);
		milestone.setUpdatedAt(now);
		ProjectMilestone saved = milestoneRepository.save(milestone);
		saveItems(saved.getId(), project.getId(), request.taskIds());
		auditLogger.recordMilestoneChange(project.getId(), ProjectAuditAction.MILESTONE_CREATED,
				"Tao moc tien do \"" + request.name() + "\" voi ngay ke hoach " + request.plannedDate());
		return toResponse(saved);
	}

	@Override
	public ProjectMilestoneRes updateMilestone(Long projectId, Long milestoneId, ProjectMilestoneReq request) {
		Project project = requireOpenProject(projectId);
		ProjectMilestone milestone = requireMilestone(projectId, milestoneId);
		applyRequest(milestone, request);
		milestone.setUpdatedAt(LocalDateTime.now(clock));
		milestoneRepository.save(milestone);
		milestoneItemRepository.deleteByMilestoneId(milestoneId);
		saveItems(milestoneId, project.getId(), request.taskIds());
		auditLogger.recordMilestoneChange(project.getId(), ProjectAuditAction.MILESTONE_UPDATED,
				"Cap nhat moc tien do \"" + request.name() + "\"");
		return toResponse(milestone);
	}

	@Override
	public ProjectMilestoneRes completeMilestone(Long projectId, Long milestoneId,
			ProjectMilestoneCompleteReq request) {
		Project project = requireOpenProject(projectId);
		ProjectMilestone milestone = requireMilestone(projectId, milestoneId);
		if (request.actualDate().isAfter(LocalDate.now(clock))) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay thuc te khong duoc o tuong lai");
		}
		milestone.setActualDate(request.actualDate());
		milestone.setUpdatedAt(LocalDateTime.now(clock));
		milestoneRepository.save(milestone);
		auditLogger.recordMilestoneChange(project.getId(), ProjectAuditAction.MILESTONE_UPDATED,
				"Ghi nhan ngay thuc te " + request.actualDate() + " cho moc \""
						+ milestone.getName() + "\"");
		return toResponse(milestone);
	}

	@Override
	public void deleteMilestone(Long projectId, Long milestoneId) {
		Project project = requireOpenProject(projectId);
		ProjectMilestone milestone = requireMilestone(projectId, milestoneId);
		auditLogger.recordMilestoneChange(project.getId(), ProjectAuditAction.MILESTONE_DELETED,
				"Xoa moc tien do \"" + milestone.getName() + "\"");
		milestoneItemRepository.deleteByMilestoneId(milestoneId);
		milestoneRepository.delete(milestone);
	}

	@Override
	@Transactional(readOnly = true)
	public List<ProjectMilestoneRes> getMilestones(Long projectId) {
		requireProject(projectId);
		return milestoneRepository.findByProjectIdOrderByPlannedDateAscIdAsc(projectId).stream()
				.map(this::toResponse).toList();
	}

	private void requireWorkBreakdown(Long projectId) {
		if (workPackageRepository.findByProjectIdOrderBySortOrderAscIdAsc(projectId).isEmpty()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Du an chua co cay cong viec, khong the khai bao moc tien do");
		}
	}

	private void applyRequest(ProjectMilestone milestone, ProjectMilestoneReq request) {
		milestone.setName(request.name().trim());
		milestone.setDescription(blankToNull(request.description()));
		milestone.setPlannedDate(request.plannedDate());
	}

	private void saveItems(Long milestoneId, Long projectId, List<Long> taskIds) {
		List<Long> distinctIds = taskIds.stream().distinct().toList();
		Map<Long, Task> tasksById = taskRepository.findByProjectIdOrderByIdAsc(projectId).stream()
				.filter(task -> distinctIds.contains(task.getId()))
				.collect(Collectors.toMap(Task::getId, Function.identity()));
		for (Long taskId : distinctIds) {
			if (!tasksById.containsKey(taskId)) {
				throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Cong viec #" + taskId + " khong thuoc cay cong viec cua du an");
			}
		}
		for (Long taskId : distinctIds) {
			ProjectMilestoneItem item = new ProjectMilestoneItem();
			item.setMilestoneId(milestoneId);
			item.setTaskId(taskId);
			milestoneItemRepository.save(item);
		}
	}

	/** TC-02: he thong ra soat tien do — so ngay hien tai voi ngay ke hoach. */
	private ProjectMilestoneRes toResponse(ProjectMilestone milestone) {
		LocalDate today = LocalDate.now(clock);
		MilestoneProgressStatus status;
		Long daysLate = null;
		if (milestone.getActualDate() != null) {
			status = MilestoneProgressStatus.DONE;
		} else if (milestone.getPlannedDate().isBefore(today)) {
			status = MilestoneProgressStatus.LATE;
			daysLate = ChronoUnit.DAYS.between(milestone.getPlannedDate(), today);
		} else {
			status = MilestoneProgressStatus.ON_TRACK;
		}
		Map<Long, Task> tasksById = taskRepository
				.findByProjectIdOrderByIdAsc(milestone.getProjectId()).stream()
				.collect(Collectors.toMap(Task::getId, Function.identity()));
		List<ProjectMilestoneRes.ProjectMilestoneItemRes> items =
				milestoneItemRepository.findByMilestoneIdOrderByIdAsc(milestone.getId()).stream()
						.map(item -> {
							Task task = tasksById.get(item.getTaskId());
							return new ProjectMilestoneRes.ProjectMilestoneItemRes(
									item.getTaskId(), task == null ? null : task.getName(),
									task == null ? null : task.getStatus());
						}).toList();
		return new ProjectMilestoneRes(milestone.getId(), milestone.getProjectId(), milestone.getName(),
				milestone.getDescription(), milestone.getPlannedDate(), milestone.getActualDate(),
				status, daysLate, items);
	}

	private ProjectMilestone requireMilestone(Long projectId, Long milestoneId) {
		return milestoneRepository.findById(milestoneId)
				.filter(milestone -> milestone.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay moc tien do thuoc du an"));
	}

	private Project requireOpenProject(Long projectId) {
		Project project = requireProject(projectId);
		if (project.getStatus() != ProjectStatus.RUNNING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong the thay doi moc tien do cua du an da dong");
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



