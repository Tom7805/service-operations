package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.dto.request.TimesheetApproveReq;
import com.serviceops.modules.timesheet.dto.response.TimesheetApprovalRes;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.mapper.TimesheetMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.repository.TimesheetRepository;
import com.serviceops.modules.timesheet.service.impl.TimesheetApprovalServiceImpl;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test nghiep vu duyet bang cham cong (NCL-06-CN-003).
 */
@ExtendWith(MockitoExtension.class)
class TimesheetApprovalServiceTest {

	private static final Long PM_ONE = 2L;
	private static final Long PM_TWO = 3L;
	private static final Long MEMBER = 7L;
	private static final LocalDate WEEK_FROM = LocalDate.of(2026, 9, 7);
	private static final LocalDate WEEK_TO = LocalDate.of(2026, 9, 13);

	@Mock
	private TimeEntryRepository timeEntryRepository;
	@Mock
	private TimesheetRepository timesheetRepository;
	@Mock
	private TaskRepository taskRepository;
	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock
	private AuditLogService auditLogService;

	private TimesheetApprovalServiceImpl service;
	private Timesheet timesheet;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-14T10:00:00Z"), ZoneId.of("UTC"));
		service = new TimesheetApprovalServiceImpl(timeEntryRepository, timesheetRepository, taskRepository,
				projectRepository, currentUserScopeProvider, auditLogService, new TimesheetMapper(), clock);

		timesheet = new Timesheet();
		timesheet.setId(50L);
		timesheet.setUserId(MEMBER);
		timesheet.setWeekStartDate(WEEK_FROM);
		timesheet.setWeekEndDate(WEEK_TO);
		timesheet.setStatus(TimesheetStatus.PENDING_APPROVAL);
		timesheet.setTotalHours(new BigDecimal("10"));
	}

	private TimeEntry entry(Long id, Long taskId, BigDecimal hours) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setTaskId(taskId);
		entry.setUserId(MEMBER);
		entry.setWorkDate(WEEK_FROM);
		entry.setHours(hours);
		entry.setStatus(TimeEntryStatus.SUBMITTED);
		return entry;
	}

	private Task task(Long taskId, Long projectId, BigDecimal budgetHours) {
		Task task = new Task();
		task.setId(taskId);
		task.setProjectId(projectId);
		task.setName("Cong viec " + taskId);
		task.setBudgetHours(budgetHours);
		task.setApprovedHours(BigDecimal.ZERO);
		return task;
	}

	private Project project(Long projectId, Long pmId) {
		Project project = new Project();
		project.setId(projectId);
		project.setProjectManagerId(pmId);
		return project;
	}

	private void stubTaskInProject(Long taskId, Long projectId, Long pmId) {
		when(taskRepository.findById(taskId)).thenReturn(Optional.of(task(taskId, projectId, null)));
		when(projectRepository.findById(projectId)).thenReturn(Optional.of(project(projectId, pmId)));
	}

	@Test
	void approvesWholeTimesheetUpdatesApprovedHoursAndCompletesRow() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(PM_ONE);
		when(timesheetRepository.findById(50L)).thenReturn(Optional.of(timesheet));
		TimeEntry first = entry(30L, 20L, new BigDecimal("5"));
		TimeEntry second = entry(31L, 20L, new BigDecimal("3"));
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(MEMBER, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(first, second));
		stubTaskInProject(20L, 1L, PM_ONE);
		when(timeEntryRepository.sumHoursByTaskIdAndStatusIn(20L, List.of(TimeEntryStatus.APPROVED)))
				.thenReturn(new BigDecimal("8"));
		when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(invocation -> invocation.getArgument(0));

		TimesheetApprovalRes result = service.approve(50L, new TimesheetApproveReq(null, null));

		assertEquals(TimesheetStatus.APPROVED, result.timesheet().status());
		assertTrue(result.overBudgetWarnings().isEmpty());
		assertEquals(TimeEntryStatus.APPROVED, first.getStatus());
		assertEquals(TimeEntryStatus.APPROVED, second.getStatus());
		verify(taskRepository).save(any(Task.class));
		verify(auditLogService).record(eq("Duyet bang cham cong"), eq(AuditTargetType.GENERAL), eq(50L),
				eq("Bang cham cong tuan"), contains("2 dong"));
	}

	@Test
	void warnsWhenApprovedHoursReachBudgetThreshold() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(PM_ONE);
		when(timesheetRepository.findById(50L)).thenReturn(Optional.of(timesheet));
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(MEMBER, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(entry(30L, 20L, new BigDecimal("8"))));
		Task budgetTask = task(20L, 1L, new BigDecimal("8"));
		when(taskRepository.findById(20L)).thenReturn(Optional.of(budgetTask));
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project(1L, PM_ONE)));
		when(timeEntryRepository.sumHoursByTaskIdAndStatusIn(20L, List.of(TimeEntryStatus.APPROVED)))
				.thenReturn(new BigDecimal("8"));
		when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(invocation -> invocation.getArgument(0));

		TimesheetApprovalRes result = service.approve(50L, new TimesheetApproveReq(null, null));

		assertEquals(1, result.overBudgetWarnings().size());
		assertTrue(result.overBudgetWarnings().get(0).contains("80% ngan sach"));
		assertEquals(TimesheetStatus.APPROVED, result.timesheet().status());
	}

	@Test
	void bulkApproveLeavesOtherManagersEntriesPending() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(PM_ONE);
		when(timesheetRepository.findById(50L)).thenReturn(Optional.of(timesheet));
		TimeEntry mine = entry(30L, 20L, new BigDecimal("5"));
		TimeEntry theirs = entry(31L, 21L, new BigDecimal("5"));
		theirs.setWorkDate(WEEK_FROM);
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(MEMBER, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(mine, theirs));
		stubTaskInProject(20L, 1L, PM_ONE);
		stubTaskInProject(21L, 2L, PM_TWO);
		when(timeEntryRepository.sumHoursByTaskIdAndStatusIn(eq(20L), anyList()))
				.thenReturn(new BigDecimal("5"));

		TimesheetApprovalRes result = service.approve(50L, new TimesheetApproveReq(null, null));

		assertEquals(TimeEntryStatus.APPROVED, mine.getStatus());
		assertEquals(TimeEntryStatus.SUBMITTED, theirs.getStatus());
		assertEquals(TimesheetStatus.PENDING_APPROVAL, result.timesheet().status());
		verify(timesheetRepository, never()).save(any(Timesheet.class));
	}

	@Test
	void rejectsApprovingEntryInForeignProject() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(PM_ONE);
		when(timesheetRepository.findById(50L)).thenReturn(Optional.of(timesheet));
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(MEMBER, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(entry(30L, 20L, new BigDecimal("5")), entry(31L, 21L, new BigDecimal("5"))));
		stubTaskInProject(21L, 2L, PM_TWO);

		assertThrows(AccessDeniedException.class,
				() -> service.approve(50L, new TimesheetApproveReq(List.of(31L), null)));
	}

	@Test
	void rejectsUnknownEntryId() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(PM_ONE);
		when(timesheetRepository.findById(50L)).thenReturn(Optional.of(timesheet));
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(MEMBER, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(entry(30L, 20L, new BigDecimal("5"))));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.approve(50L, new TimesheetApproveReq(List.of(99L), null)));

		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
	}

	@Test
	void rejectsApprovingNonPendingTimesheet() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(PM_ONE);
		timesheet.setStatus(TimesheetStatus.APPROVED);
		when(timesheetRepository.findById(50L)).thenReturn(Optional.of(timesheet));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.approve(50L, new TimesheetApproveReq(null, null)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void queueShowsOnlyEntriesOfManagedProjects() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(PM_ONE);
		when(timesheetRepository.findByStatusOrderBySubmittedAtAsc(TimesheetStatus.PENDING_APPROVAL))
				.thenReturn(List.of(timesheet));
		TimeEntry mine = entry(30L, 20L, new BigDecimal("5"));
		TimeEntry theirs = entry(31L, 21L, new BigDecimal("5"));
		theirs.setWorkDate(WEEK_FROM);
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(MEMBER, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(mine, theirs));
		stubTaskInProject(20L, 1L, PM_ONE);
		stubTaskInProject(21L, 2L, PM_TWO);

		var queue = service.findPending();

		assertEquals(1, queue.size());
		assertEquals(50L, queue.get(0).timesheetId());
		assertEquals(1, queue.get(0).pendingEntries());
		assertEquals(new BigDecimal("5"), queue.get(0).pendingHours());
	}

	@Test
	void auditLogsApprovalAction() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(PM_ONE);
		when(timesheetRepository.findById(50L)).thenReturn(Optional.of(timesheet));
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(MEMBER, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of(entry(30L, 20L, new BigDecimal("5"))));
		stubTaskInProject(20L, 1L, PM_ONE);
		when(timeEntryRepository.sumHoursByTaskIdAndStatusIn(eq(20L), anyList()))
				.thenReturn(new BigDecimal("5"));
		when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(invocation -> invocation.getArgument(0));

		service.approve(50L, new TimesheetApproveReq(List.of(30L), "Duyet cho dot nay"));

		verify(auditLogService).record(eq("Duyet bang cham cong"), eq(AuditTargetType.GENERAL), eq(50L),
				eq("Bang cham cong tuan"), contains("1 dong"));
	}
}
