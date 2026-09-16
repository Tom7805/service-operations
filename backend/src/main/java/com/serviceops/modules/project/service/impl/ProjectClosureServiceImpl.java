package com.serviceops.modules.project.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.project.enums.TaskStatus;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.project.service.ProjectClosureService;
import com.serviceops.modules.project.validator.ProjectClosureValidator;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectClosureServiceImpl implements ProjectClosureService {

	private final ProjectRepository projectRepository;
	private final TaskRepository taskRepository;
	private final TimeEntryRepository timeEntryRepository;
	private final ProjectClosureValidator validator;
	private final ProjectAuditLogger auditLogger;

	@Override
	public ProjectRes closeProject(Long projectId) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an voi id=" + projectId));

		List<Task> allTasks = taskRepository.findByProjectIdOrderByIdAsc(projectId);
		List<Task> pendingTasks = allTasks.stream()
				.filter(task -> task.getStatus() == TaskStatus.WAITING_APPROVAL)
				.toList();
		validator.validate(project, pendingTasks);

		project.setStatus(ProjectStatus.CLOSED);
		project = projectRepository.save(project);

		voidDraftTimeEntries(project.getId(), allTasks);

		auditLogger.recordClose(project.getId(), project.getProjectCode());
		return toResponse(project);
	}

	/**
	 * Xoa cac dong gio cong con NHAP (DRAFT) thuoc du an vua dong. Dong NHAP chua tung
	 * duoc nop/duyet nen khong anh huong gio cong da duyet hay doanh thu — giu lai chi
	 * khien chung mac ket vinh vien (khong con sua/xoa duoc vi giao dien an het loi vao
	 * khi du an CLOSED, nhung van tinh vao so dong "can nop" cua bang cham cong tuan,
	 * khien nhan su khong bao gio nop het duoc tuan do). Xoa ngay khi dong du an la cach
	 * "huy bo anh huong" ung voi tinh than QTN-13 (khong ghi gio vao du an da dong).
	 */
	private void voidDraftTimeEntries(Long projectId, List<Task> tasks) {
		List<Long> taskIds = tasks.stream().map(Task::getId).toList();
		if (taskIds.isEmpty()) {
			return;
		}
		List<TimeEntry> draftEntries = timeEntryRepository.findByTaskIdInAndStatus(taskIds, TimeEntryStatus.DRAFT);
		if (draftEntries.isEmpty()) {
			return;
		}
		timeEntryRepository.deleteAll(draftEntries);
		auditLogger.recordTimeEntryChange(projectId, null,
				"Da xoa " + draftEntries.size() + " dong gio cong con Nhap con sot lai khi dong du an");
	}

	private ProjectRes toResponse(Project project) {
		return new ProjectRes(project.getId(), project.getProjectCode(), project.getName(), project.getContractId(),
				project.getCustomerId(), project.getProjectType(), project.getLimitValue(), project.getStartDate(),
				project.getExpectedEndDate(), project.getProjectManagerId(), project.getStatus().name(),
				project.getCreatedBy(), project.getCreatedAt());
	}
}
