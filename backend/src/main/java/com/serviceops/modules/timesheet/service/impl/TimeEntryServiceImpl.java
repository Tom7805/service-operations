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
import com.serviceops.modules.timesheet.dto.response.TimeEntryTaskRes;
import com.serviceops.modules.timesheet.dto.response.TimerRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetSummaryRes;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.entity.TimesheetTimer;
import com.serviceops.modules.timesheet.mapper.TimeEntryMapper;
import com.serviceops.modules.timesheet.mapper.TimesheetMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.repository.TimesheetTimerRepository;
import com.serviceops.modules.timesheet.service.TimeEntryService;
import com.serviceops.modules.timesheet.validator.DailyHourLimitValidator;
import com.serviceops.modules.timesheet.validator.ImmutableEntryValidator;
import com.serviceops.modules.timesheet.validator.OpenPeriodValidator;
import com.serviceops.modules.timesheet.validator.OpenProjectValidator;
import com.serviceops.modules.timesheet.validator.PeriodLockValidator;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
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
	private final TimesheetTimerRepository timesheetTimerRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final ProjectAuditLogger auditLogger;
	private final OpenProjectValidator openProjectValidator;
	private final OpenPeriodValidator openPeriodValidator;
	private final DailyHourLimitValidator dailyHourLimitValidator;
	private final ImmutableEntryValidator immutableEntryValidator;
	private final PeriodLockValidator periodLockValidator;
	private final TimeEntryMapper timeEntryMapper;
	private final TimesheetMapper timesheetMapper;
	private final Clock clock;

	@Override
	public TimeEntryRes create(Long projectId, Long taskId, TimeEntryCreateReq request) {
		Task task = requireTaskInRunningProject(projectId, taskId);
		Long currentUserId = requireAssignee(task.getId());
		openPeriodValidator.validate(request.workDate());
		periodLockValidator.validateOpen(request.workDate());

		if (timeEntryRepository.existsByUserIdAndTaskIdAndWorkDate(currentUserId, task.getId(), request.workDate())) {
			throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
					"Da co ban ghi gio cong cho cong viec nay trong ngay "
							+ request.workDate() + " — hay sua ban ghi da co thay vi tao moi");
		}
		dailyHourLimitValidator.validate(currentUserId, request.workDate(), request.hours(), BigDecimal.ZERO);

		TimeEntry entry = new TimeEntry();
		entry.setTaskId(task.getId());
		entry.setUserId(currentUserId);
		entry.setWorkDate(request.workDate());
		entry.setHours(request.hours());
		entry.setNote(request.note());
		entry.setBillable(request.billable() != null ? request.billable() : true);
		entry.setWorkType(request.workType() != null ? request.workType() : com.serviceops.modules.timesheet.enums.WorkType.NORMAL);
		entry.setCreatedBy(currentUsername());
		LocalDateTime now = LocalDateTime.now(clock);
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
		periodLockValidator.validateOpen(entry.getWorkDate());
		dailyHourLimitValidator.validate(currentUserId, entry.getWorkDate(), request.hours(), entry.getHours());

		BigDecimal previousHours = entry.getHours();
		entry.setHours(request.hours());
		entry.setNote(request.note());
		if (request.billable() != null) {
			entry.setBillable(request.billable());
		}
		if (request.workType() != null) {
			entry.setWorkType(request.workType());
		}
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
		periodLockValidator.validateOpen(entry.getWorkDate());

		timeEntryRepository.delete(entry);
		auditLogger.recordTimeEntryChange(projectId, task.getId(),
				"xoa " + formatHours(entry.getHours()) + " gio ngay " + entry.getWorkDate());
	}

	@Override
	public TimerRes startTimer(Long projectId, Long taskId, String note, Boolean billable) {
		Task task = requireTaskInRunningProject(projectId, taskId);
		Long currentUserId = requireAssignee(task.getId());
		LocalDate today = LocalDate.now(clock);
		openPeriodValidator.validate(today);
		periodLockValidator.validateOpen(today);

		if (timesheetTimerRepository.findByUserId(currentUserId).isPresent()) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ban dang co mot dong ho bam gio dang chay");
		}

		TimesheetTimer timer = new TimesheetTimer();
		timer.setUserId(currentUserId);
		timer.setTaskId(task.getId());
		timer.setStartedAt(LocalDateTime.now(clock));
		timer.setNote(note);
		timer.setBillable(billable != null ? billable : true);
		TimesheetTimer saved = timesheetTimerRepository.save(timer);
		auditLogger.recordTimeEntryChange(projectId, task.getId(), "bat dau dong ho bam gio");
		return toTimerResponse(saved, projectId, LocalDateTime.now(clock));
	}

	/** NCL-06-CN-008 QTN-14: dong ho chay qua nguong nay bi coi la "quen bam dung" — huy, khong tao dong gio cong. */
	private static final BigDecimal MAX_TIMER_HOURS = BigDecimal.valueOf(12);

	@Override
	public TimeEntryRes stopTimer() {
		Long currentUserId = requireCurrentUser();
		TimesheetTimer timer = timesheetTimerRepository.findByUserId(currentUserId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.INVALID_STATE,
						"Khong co dong ho bam gio dang chay"));
		LocalDateTime stoppedAt = LocalDateTime.now(clock);
		long elapsedSeconds = java.time.Duration.between(timer.getStartedAt(), stoppedAt).getSeconds();
		BigDecimal hours = BigDecimal.valueOf(elapsedSeconds)
				.divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP)
				.max(new BigDecimal("0.01"));

		if (hours.compareTo(MAX_TIMER_HOURS) > 0) {
			// TC-02: quen bam dung, dong ho chay qua 12 gio — huy, KHONG tao dong gio cong,
			// nguoi dung phai tu nhap tay lai cho dung so gio thuc te da lam.
			timesheetTimerRepository.delete(timer);
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Dong ho da chay qua 12 gio nen bi huy tu dong, khong tao dong gio cong nao."
							+ " Vui long tu nhap tay dong gio cong dung voi thoi gian ban da lam.");
		}

		Task task = taskRepository.findById(timer.getTaskId())
				.orElseThrow(() -> notFound("Khong tim thay cong viec cua dong ho bam gio"));
		TimeEntryRes result = create(task.getProjectId(), task.getId(),
				new TimeEntryCreateReq(timer.getStartedAt().toLocalDate(), hours, timer.getNote(), timer.getBillable(), null));
		timesheetTimerRepository.delete(timer);
		return result;
	}

	@Override
	@Transactional(readOnly = true)
	public TimerRes findMyTimer() {
		Long currentUserId = requireCurrentUser();
		return timesheetTimerRepository.findByUserId(currentUserId)
				.map(timer -> {
					Task task = taskRepository.findById(timer.getTaskId()).orElse(null);
					return task == null ? null : toTimerResponse(timer, task.getProjectId(), LocalDateTime.now(clock));
				})
				.orElse(null);
	}

	@Override
	@Transactional(readOnly = true)
	public List<TimeEntryTaskRes> findMyRunningTasks() {
		Long currentUserId = currentUserScopeProvider.currentUserId();
		if (currentUserId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}

		var assignments = assignmentRepository.findByUserIdOrderByIdAsc(currentUserId);
		// Hieu nang: nap truoc cong viec + du an bang 2 truy van IN; cac findById ben duoi lay tu
		// persistence context (cung transaction) thay vi 2 truy van cho MOI phan cong. Ket qua khong doi.
		List<Task> prefetchedTasks = taskRepository.findAllById(assignments.stream()
				.map(assignment -> assignment.getTaskId()).filter(Objects::nonNull).distinct().toList());
		if (prefetchedTasks != null && !prefetchedTasks.isEmpty()) {
			projectRepository.findAllById(prefetchedTasks.stream()
					.map(Task::getProjectId).filter(Objects::nonNull).distinct().toList());
		}

		return assignments.stream()
				.map(assignment -> taskRepository.findById(assignment.getTaskId()).orElse(null))
				.filter(Objects::nonNull)
				.map(task -> projectRepository.findById(task.getProjectId())
						.filter(project -> project.getStatus() == com.serviceops.modules.project.enums.ProjectStatus.RUNNING)
						.map(project -> new TimeEntryTaskRes(project.getId(), project.getName(), task.getId(), task.getName(),
								task.getStatus()))
						.orElse(null))
				.filter(Objects::nonNull)
				.toList();
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

	/**
	 * Chi nguoi dang duoc giao cong viec moi duoc ghi gio (TC-02, giong NCL-05-CN-004).
	 *
	 * <p>Dung {@link BusinessRuleException} (khong phai {@link AccessDeniedException}) de
	 * thong bao cu the "Ban khong phai nguoi duoc giao cong viec nay" den duoc client —
	 * {@code GlobalExceptionHandler} luon ghi de message cua AccessDeniedException bang mot
	 * cau chung chung (dung cho loi @PreAuthorize tu choi vai tro, TC-03). Pattern nay giong
	 * {@code DepartmentServiceImpl#requireCanView}.</p>
	 */
	private Long requireAssignee(Long taskId) {
		Long currentUserId = currentUserScopeProvider.currentUserId();
		if (currentUserId == null || !assignmentRepository.existsByTaskIdAndUserId(taskId, currentUserId)) {
			throw new BusinessRuleException(ErrorCode.FORBIDDEN, "Ban khong phai nguoi duoc giao cong viec nay");
		}
		return currentUserId;
	}

	private Long requireCurrentUser() {
		Long currentUserId = currentUserScopeProvider.currentUserId();
		if (currentUserId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}
		return currentUserId;
	}

	private TimerRes toTimerResponse(TimesheetTimer timer, Long projectId, LocalDateTime now) {
		BigDecimal elapsedHours = BigDecimal.valueOf(java.time.Duration.between(timer.getStartedAt(), now).getSeconds())
				.divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP)
				.max(new BigDecimal("0.00"));
		return new TimerRes(timer.getId(), projectId, timer.getTaskId(), timer.getUserId(), timer.getStartedAt(),
				 elapsedHours, timer.getNote(), timer.getBillable());
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
