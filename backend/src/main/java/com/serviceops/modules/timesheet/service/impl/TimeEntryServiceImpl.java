package com.serviceops.modules.timesheet.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskAssignmentRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.dto.request.TimeEntryCreateReq;
import com.serviceops.modules.timesheet.dto.request.TimeEntryUpdateReq;
import com.serviceops.modules.timesheet.dto.response.TimeEntryRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetSummaryRes;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.mapper.TimeEntryMapper;
import com.serviceops.modules.timesheet.mapper.TimesheetMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.service.TimeEntryService;
import com.serviceops.modules.timesheet.validator.DailyHourLimitValidator;
import com.serviceops.modules.timesheet.validator.ImmutableEntryValidator;
import com.serviceops.modules.timesheet.validator.OpenPeriodValidator;
import com.serviceops.modules.timesheet.validator.OpenProjectValidator;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class TimeEntryServiceImpl implements TimeEntryService {

	private final ProjectRepository projectRepository;
	private final TaskRepository taskRepository;
	private final TaskAssignmentRepository assignmentRepository;
	private final TimeEntryRepository timeEntryRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final ProjectAuditLogger auditLogger;
	private final OpenProjectValidator openProjectValidator;
	private final OpenPeriodValidator openPeriodValidator;
	private final DailyHourLimitValidator dailyHourLimitValidator;
	private final ImmutableEntryValidator immutableEntryValidator;
	private final TimeEntryMapper timeEntryMapper;
	private final TimesheetMapper timesheetMapper;

	@Override
	public TimeEntryRes create(Long projectId, Long taskId, TimeEntryCreateReq request) {
		Task task = requireTaskInRunningProject(projectId, taskId);
		Long currentUserId = requireAssignee(task.getId());
		openPeriodValidator.validate(request.workDate());

		timeEntryRepository.findByUserIdAndTaskIdAndWorkDate(currentUserId, task.getId(), request.workDate())
				.ifPresent(existing -> {
					throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
							"Da co ban ghi gio cong cho cong viec nay trong ngay "
									+ request.workDate() + " — hay sua ban ghi da co thay vi tao moi");
				});
		dailyHourLimitValidator.validate(currentUserId, request.workDate(), request.hours(), BigDecimal.ZERO);

		TimeEntry entry = new TimeEntry();
		entry.setTaskId(task.getId());
		entry.setUserId(currentUserId);
		entry.setWorkDate(request.workDate());
		entry.setHours(request.hours());
		entry.setNote(request.note());
		entry.setCreatedBy(currentUsername());
		LocalDateTime now = LocalDateTime.now();
		entry.setCreatedAt(now);
		entry.setUpdatedAt(now);
		TimeEntry saved = timeEntryRepository.save(entry);

		auditLogger.recordTimeEntryChange(projectId, task.getId(),
				"ghi " + formatHours(saved.getHours()) + " gio ngay " + saved.getWorkDate());
		return timeEntryMapper.toResponse(saved);
	}

	@Override
	public TimeEntryRes update(Long projectId, Long taskId, Long entryId, TimeEntryUpdateReq request) {
		Task task = requireTaskInRunningProject(projectId, taskId);
		Long currentUserId = requireAssignee(task.getId());
		TimeEntry entry = requireOwnEntry(entryId, currentUserId, task.getId());
		immutableEntryValidator.validate(entry);
		dailyHourLimitValidator.validate(currentUserId, entry.getWorkDate(), request.hours(), entry.getHours());

		BigDecimal previousHours = entry.getHours();
		entry.setHours(request.hours());
		entry.setNote(request.note());
		entry.setUpdatedAt(LocalDateTime.now());
		TimeEntry saved = timeEntryRepository.save(entry);

		auditLogger.recordTimeEntryChange(projectId, task.getId(),
				"sua " + formatHours(previousHours) + " -> " + formatHours(saved.getHours())
						+ " gio ngay " + saved.getWorkDate());
		return timeEntryMapper.toResponse(saved);
	}

	@Override
	public void delete(Long projectId, Long taskId, Long entryId) {
		Task task = requireTaskInRunningProject(projectId, taskId);
		Long currentUserId = requireAssignee(task.getId());
		TimeEntry entry = requireOwnEntry(entryId, currentUserId, task.getId());
		immutableEntryValidator.validate(entry);

		timeEntryRepository.delete(entry);
		auditLogger.recordTimeEntryChange(projectId, task.getId(),
				"xoa " + formatHours(entry.getHours()) + " gio ngay " + entry.getWorkDate());
	}

	@Override
	@Transactional(readOnly = true)
	public List<TimesheetSummaryRes> findMyWeek(LocalDate weekFrom, LocalDate weekTo) {
		if (weekTo.isBefore(weekFrom)) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ngay ket thuc tuan cham cong khong duoc som hon ngay bat dau");
		}
		Long currentUserId = currentUserScopeProvider.currentUserId();
		if (currentUserId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}
		List<TimeEntry> entries = timeEntryRepository
				.findByUserIdAndWorkDateBetweenOrderByIdAsc(currentUserId, weekFrom, weekTo);

		return entries.stream()
				.map(TimeEntry::getTaskId)
				.distinct()
				.sorted()
				.map(taskId -> toSummary(taskId, weekFrom, weekTo, entries))
				.toList();
	}

	private TimesheetSummaryRes toSummary(Long taskId, LocalDate weekFrom, LocalDate weekTo,
			List<TimeEntry> weekEntries) {
		Task task = taskRepository.findById(taskId).orElse(null);
		String taskName = task == null ? null : task.getName();
		List<TimeEntryRes> taskEntries = weekEntries.stream()
				.filter(entry -> Objects.equals(entry.getTaskId(), taskId))
				.sorted(Comparator.comparing(TimeEntry::getWorkDate).thenComparing(TimeEntry::getId))
				.map(timeEntryMapper::toResponse)
				.toList();
		return timesheetMapper.toSummary(taskId, taskName, weekFrom, weekTo, taskEntries,
				task == null ? null : task.getBudgetHours(),
				task == null ? BigDecimal.ZERO : task.getApprovedHours());
	}

	/** Chi nguoi dang duoc giao cong viec moi duoc ghi gio (TC-02, giong NCL-05-CN-004). */
	private Long requireAssignee(Long taskId) {
		Long currentUserId = currentUserScopeProvider.currentUserId();
		if (currentUserId == null || !assignmentRepository.existsByTaskIdAndUserId(taskId, currentUserId)) {
			throw new AccessDeniedException("Ban khong phai nguoi duoc giao cong viec nay");
		}
		return currentUserId;
	}

	private Task requireTaskInRunningProject(Long projectId, Long taskId) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> notFound("Khong tim thay du an"));
		openProjectValidator.validate(project);
		return taskRepository.findById(taskId)
				.filter(item -> item.getProjectId().equals(projectId))
				.orElseThrow(() -> notFound("Khong tim thay cong viec thuoc du an"));
	}

	private TimeEntry requireOwnEntry(Long entryId, Long currentUserId, Long taskId) {
		return timeEntryRepository.findById(entryId)
				.filter(entry -> entry.getUserId().equals(currentUserId)
						&& entry.getTaskId().equals(taskId))
				.orElseThrow(() -> notFound("Khong tim thay ban ghi gio cong cua ban tren cong viec nay"));
	}

	private BusinessRuleException notFound(String message) {
		return new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, message);
	}

	private String formatHours(BigDecimal hours) {
		return hours == null ? "0" : hours.toPlainString();
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
