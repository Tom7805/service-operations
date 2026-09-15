package com.serviceops.modules.timesheet;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.entity.TaskAssignment;
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
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.mapper.TimeEntryMapper;
import com.serviceops.modules.timesheet.mapper.TimesheetMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.repository.TimesheetTimerRepository;
import com.serviceops.modules.timesheet.repository.TimesheetPeriodRepository;
import com.serviceops.modules.timesheet.service.impl.TimeEntryServiceImpl;
import com.serviceops.modules.timesheet.validator.DailyHourLimitValidator;
import com.serviceops.modules.timesheet.validator.ImmutableEntryValidator;
import com.serviceops.modules.timesheet.validator.OpenPeriodValidator;
import com.serviceops.modules.timesheet.validator.OpenProjectValidator;
import com.serviceops.modules.timesheet.validator.PeriodLockValidator;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test nghiep vu ghi gio cong theo cong viec (NCL-06-CN-001).
 *
 * <p>Dung dong ho he thong ({@link Clock}) inject de cap ngay "hom nay"
 * bang 2026-09-10 — nghiep vu theo ngay khong flaky theo ngay chay test.</p>
 */
@ExtendWith(MockitoExtension.class)
class TimeEntryServiceTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 9, 10);

	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private TaskRepository taskRepository;
	@Mock
	private TaskAssignmentRepository assignmentRepository;
	@Mock
	private TimeEntryRepository timeEntryRepository;
	@Mock
	private TimesheetTimerRepository timesheetTimerRepository;
	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock
	private ProjectAuditLogger auditLogger;
	@Mock
	private TimesheetPeriodRepository periodRepository;

	private TimeEntryServiceImpl service;
	private Project project;
	private Task task;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-10T00:00:00Z"), ZoneId.of("UTC"));
		service = new TimeEntryServiceImpl(projectRepository, taskRepository, assignmentRepository,
				timeEntryRepository, timesheetTimerRepository, currentUserScopeProvider, auditLogger,
				new OpenProjectValidator(), new OpenPeriodValidator(clock),
				new DailyHourLimitValidator(timeEntryRepository), new ImmutableEntryValidator(),
				new PeriodLockValidator(periodRepository),
				new TimeEntryMapper(), new TimesheetMapper(), clock);

		project = new Project();
		project.setId(1L);
		project.setStatus(com.serviceops.modules.project.enums.ProjectStatus.RUNNING);

		task = new Task();
		task.setId(20L);
		task.setProjectId(1L);
		task.setBudgetHours(new BigDecimal("8"));
		task.setApprovedHours(BigDecimal.ZERO);
	}

	private void stubAssigneeTask() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
		when(taskRepository.findById(20L)).thenReturn(Optional.of(task));
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);
		when(assignmentRepository.existsByTaskIdAndUserId(20L, 7L)).thenReturn(true);
	}

	@Test
	void logsTimeForOwnAssignedTask() {
		stubAssigneeTask();
		when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(invocation -> {
			TimeEntry saved = invocation.getArgument(0);
			saved.setId(30L);
			return saved;
		});

		TimeEntryRes response = service.create(1L, 20L,
				new TimeEntryCreateReq(TODAY, new BigDecimal("3.5"), "Phan tich quy trinh", true));

		assertEquals(30L, response.id());
		assertEquals(20L, response.taskId());
		assertEquals(7L, response.userId());
		assertEquals(TODAY, response.workDate());
		assertEquals(new BigDecimal("3.5"), response.hours());
		assertEquals(TimeEntryStatus.DRAFT, response.status());
		verify(auditLogger).recordTimeEntryChange(1L, 20L,
				"ghi 3.5 gio ngay " + TODAY);
	}

	@Test
	void rejectsTimeLoggingWhenCallerIsNotAssignee() {
		stubAssigneeTask();
		when(assignmentRepository.existsByTaskIdAndUserId(20L, 7L)).thenReturn(false);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class, () -> service.create(1L, 20L,
				new TimeEntryCreateReq(TODAY, new BigDecimal("2"), "note", true)));

		assertEquals(ErrorCode.FORBIDDEN, exception.getErrorCode());
		assertEquals("Ban khong phai nguoi duoc giao cong viec nay", exception.getMessage());
		verify(timeEntryRepository, never()).save(any(TimeEntry.class));
	}

	@Test
	void rejectsTimeLoggingOnClosedProject() {
		project.setStatus(com.serviceops.modules.project.enums.ProjectStatus.CLOSED);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, 20L, new TimeEntryCreateReq(TODAY, new BigDecimal("2"), "note", true)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void listsOnlyAssignedTasksFromRunningProjects() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);
		TaskAssignment runningAssignment = new TaskAssignment();
		runningAssignment.setTaskId(20L);
		runningAssignment.setUserId(7L);
		TaskAssignment closedAssignment = new TaskAssignment();
		closedAssignment.setTaskId(21L);
		closedAssignment.setUserId(7L);

		Project closedProject = new Project();
		closedProject.setId(2L);
		closedProject.setName("Du an da dong");
		closedProject.setStatus(com.serviceops.modules.project.enums.ProjectStatus.CLOSED);
		Task closedTask = new Task();
		closedTask.setId(21L);
		closedTask.setProjectId(2L);
		closedTask.setName("Cong viec cu");
		task.setName("Cong viec dang chay");
		project.setName("Du an dang chay");

		when(assignmentRepository.findByUserIdOrderByIdAsc(7L))
				.thenReturn(List.of(runningAssignment, closedAssignment));
		when(taskRepository.findById(20L)).thenReturn(Optional.of(task));
		when(taskRepository.findById(21L)).thenReturn(Optional.of(closedTask));
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
		when(projectRepository.findById(2L)).thenReturn(Optional.of(closedProject));

		List<TimeEntryTaskRes> response = service.findMyRunningTasks();

		assertEquals(1, response.size());
		assertEquals(1L, response.get(0).projectId());
		assertEquals(20L, response.get(0).taskId());
	}

	@Test
	void rejectsTimeLoggingInFuture() {
		stubAssigneeTask();

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, 20L,
						new TimeEntryCreateReq(TODAY.plusDays(1), new BigDecimal("2"), "note", true)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	/** NCL-06-CN-006-TC-01 (Then): ky chua ngay lam viec da khoa thi chan ghi gio moi. */
	@Test
	void rejectsTimeLoggingWhenPeriodIsLocked() {
		stubAssigneeTask();
		com.serviceops.modules.timesheet.entity.TimesheetPeriod lockedPeriod =
				new com.serviceops.modules.timesheet.entity.TimesheetPeriod();
		lockedPeriod.setPeriodStart(TODAY.withDayOfMonth(1));
		lockedPeriod.setPeriodEnd(TODAY.withDayOfMonth(TODAY.lengthOfMonth()));
		lockedPeriod.setStatus(com.serviceops.modules.timesheet.enums.PeriodStatus.LOCKED);
		when(periodRepository.findByDate(TODAY)).thenReturn(Optional.of(lockedPeriod));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, 20L, new TimeEntryCreateReq(TODAY, new BigDecimal("2"), "note", true)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		assertTrue(exception.getMessage().contains("da bi khoa"));
		verify(timeEntryRepository, never()).save(any(TimeEntry.class));
	}

	@Test
	void rejectsDuplicateEntryOnSameTaskSameDay() {
		stubAssigneeTask();
		when(timeEntryRepository.existsByUserIdAndTaskIdAndWorkDate(7L, 20L, TODAY))
				.thenReturn(true);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, 20L, new TimeEntryCreateReq(TODAY, new BigDecimal("2"), "note", true)));

		assertEquals(ErrorCode.DUPLICATE_DATA, exception.getErrorCode());
	}

	@Test
	void rejectsLoggingMoreThanDailyHourLimit() {
		stubAssigneeTask();
		when(timeEntryRepository.sumHoursByUserIdAndWorkDate(7L, TODAY)).thenReturn(new BigDecimal("11.5"));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, 20L, new TimeEntryCreateReq(TODAY, new BigDecimal("1"), "note", true)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void startsTimerForOwnAssignedTask() {
		stubAssigneeTask();
		when(timesheetTimerRepository.save(any(TimesheetTimer.class))).thenAnswer(invocation -> {
			TimesheetTimer saved = invocation.getArgument(0);
			saved.setId(40L);
			return saved;
		});

		TimerRes response = service.startTimer(1L, 20L, "Phan tich quy trinh", true);

		assertEquals(40L, response.timerId());
		assertEquals(20L, response.taskId());
		assertEquals(7L, response.userId());
		assertEquals(new BigDecimal("0.00"), response.elapsedHours());
		assertEquals("Phan tich quy trinh", response.note());
	}

	@Test
	void rejectsStartingSecondTimerForSameUser() {
		stubAssigneeTask();
		when(timesheetTimerRepository.findByUserId(7L)).thenReturn(Optional.of(new TimesheetTimer()));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.startTimer(1L, 20L, "Cong viec moi", true));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(timesheetTimerRepository, never()).save(any(TimesheetTimer.class));
	}

	@Test
	void stopsTimerAndCreatesDraftTimeEntry() {
		stubAssigneeTask();
		TimesheetTimer timer = new TimesheetTimer();
		timer.setId(40L);
		timer.setUserId(7L);
		timer.setTaskId(20L);
		timer.setStartedAt(LocalDateTime.of(2026, 9, 9, 23, 0));
		timer.setNote("Phan tich quy trinh");
		timer.setBillable(true);
		when(timesheetTimerRepository.findByUserId(7L)).thenReturn(Optional.of(timer));
		when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(invocation -> {
			TimeEntry saved = invocation.getArgument(0);
			saved.setId(30L);
			return saved;
		});

		TimeEntryRes response = service.stopTimer();

		assertEquals(new BigDecimal("1.00"), response.hours());
		assertEquals(TODAY.minusDays(1), response.workDate());
		assertEquals(TimeEntryStatus.DRAFT, response.status());
		verify(timesheetTimerRepository).delete(timer);
	}

	/** NCL-06-CN-008 TC-02: quen bam dung, dong ho chay qua 12 gio — huy, KHONG tao dong gio cong. */
	@Test
	void cancelsTimerWithoutCreatingEntryWhenElapsedExceedsTwelveHours() {
		TimesheetTimer timer = new TimesheetTimer();
		timer.setId(40L);
		timer.setUserId(7L);
		timer.setTaskId(20L);
		timer.setStartedAt(LocalDateTime.of(2026, 9, 9, 7, 0));
		timer.setNote("Quen bam dung");
		timer.setBillable(true);
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);
		when(timesheetTimerRepository.findByUserId(7L)).thenReturn(Optional.of(timer));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class, service::stopTimer);

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(timesheetTimerRepository).delete(timer);
		verify(timeEntryRepository, never()).save(any(TimeEntry.class));
	}

	private TimeEntry stubOwnDraftEntry() {
		stubAssigneeTask();
		TimeEntry entry = new TimeEntry();
		entry.setId(30L);
		entry.setTaskId(20L);
		entry.setUserId(7L);
		entry.setWorkDate(TODAY);
		entry.setHours(new BigDecimal("2"));
		entry.setStatus(TimeEntryStatus.DRAFT);
		when(timeEntryRepository.findById(30L)).thenReturn(Optional.of(entry));
		return entry;
	}

	@Test
	void updatesOwnDraftEntry() {
		stubOwnDraftEntry();
		when(timeEntryRepository.sumHoursByUserIdAndWorkDate(7L, TODAY)).thenReturn(new BigDecimal("2"));
		when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

		TimeEntryRes response = service.update(1L, 20L, 30L,
				new TimeEntryUpdateReq(new BigDecimal("3"), "Da chinh sua", true));

		assertEquals(new BigDecimal("3"), response.hours());
		assertEquals("Da chinh sua", response.note());
		verify(auditLogger).recordTimeEntryChange(1L, 20L,
				"sua 2 -> 3 gio ngay " + TODAY);
	}

	@Test
	void rejectsUpdateOfSubmittedEntry() {
		TimeEntry entry = stubOwnDraftEntry();
		entry.setStatus(TimeEntryStatus.SUBMITTED);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.update(1L, 20L, 30L, new TimeEntryUpdateReq(new BigDecimal("3"), null, true)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void rejectsUpdateOfOthersEntry() {
		TimeEntry entry = stubOwnDraftEntry();
		entry.setUserId(8L);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.update(1L, 20L, 30L, new TimeEntryUpdateReq(new BigDecimal("3"), null, true)));

		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
	}

	@Test
	void deletesOwnDraftEntry() {
		TimeEntry entry = stubOwnDraftEntry();

		service.delete(1L, 20L, 30L);

		verify(timeEntryRepository).delete(entry);
		verify(auditLogger).recordTimeEntryChange(1L, 20L,
				"xoa 2 gio ngay " + TODAY);
	}

	@Test
	void rejectsDeleteOfNonDraftEntry() {
		TimeEntry entry = stubOwnDraftEntry();
		entry.setStatus(TimeEntryStatus.SUBMITTED);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.delete(1L, 20L, 30L));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(timeEntryRepository, never()).delete(any(TimeEntry.class));
	}

	@Test
	void rejectsDeleteOfOthersEntry() {
		TimeEntry entry = stubOwnDraftEntry();
		entry.setUserId(8L);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.delete(1L, 20L, 30L));

		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
		verify(timeEntryRepository, never()).delete(any(TimeEntry.class));
	}

	@Test
	void findsMyWeekGroupedByTaskWithBudgetWarning() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(7L,
				LocalDate.of(2026, 9, 7), LocalDate.of(2026, 9, 13))).thenReturn(List.of(
				entry(31L, 20L, TODAY.minusDays(3), new BigDecimal("5")),
				entry(32L, 20L, TODAY.minusDays(2), new BigDecimal("3")),
				entry(33L, 21L, TODAY.minusDays(1), new BigDecimal("2"))));
		Task task21 = new Task();
		task21.setId(21L);
		task21.setProjectId(1L);
		task21.setName("Thiet ke giao dien");
		task21.setBudgetHours(null);
		task21.setApprovedHours(BigDecimal.ZERO);
		when(taskRepository.findById(20L)).thenReturn(Optional.of(task));
		when(taskRepository.findById(21L)).thenReturn(Optional.of(task21));

		List<TimesheetSummaryRes> summaries = service.findMyWeek(
				LocalDate.of(2026, 9, 7), LocalDate.of(2026, 9, 13));

		assertEquals(2, summaries.size());
		TimesheetSummaryRes task20Summary = summaries.get(0);
		assertEquals(20L, task20Summary.taskId());
		assertEquals(new BigDecimal("8"), task20Summary.totalHours());
		assertEquals(0, new BigDecimal("1.0000").compareTo(task20Summary.usageRatio()));
		assertTrue(task20Summary.overBudgetWarning());
		assertEquals(2, task20Summary.entries().size());

		TimesheetSummaryRes task21Summary = summaries.get(1);
		assertEquals(21L, task21Summary.taskId());
		assertEquals(new BigDecimal("2"), task21Summary.totalHours());
		assertNull(task21Summary.usageRatio());
		assertTrue(!task21Summary.overBudgetWarning());
	}

	@Test
	void rejectsWeekRangeWhereEndPrecedesStart() {
		assertThrows(BusinessRuleException.class,
				() -> service.findMyWeek(LocalDate.of(2026, 9, 13), LocalDate.of(2026, 9, 7)));
	}

	@Test
	void logsTimeWithBillableFalse() {
		stubAssigneeTask();
		when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(invocation -> {
			TimeEntry saved = invocation.getArgument(0);
			saved.setId(30L);
			return saved;
		});

		TimeEntryRes response = service.create(1L, 20L,
				new TimeEntryCreateReq(TODAY, new BigDecimal("2"), "Noi dung", false));

		assertEquals(Boolean.FALSE, response.billable());
	}

	@Test
	void logsTimeDefaultsBillableToTrueWhenNull() {
		stubAssigneeTask();
		when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(invocation -> {
			TimeEntry saved = invocation.getArgument(0);
			saved.setId(30L);
			return saved;
		});

		TimeEntryRes response = service.create(1L, 20L,
				new TimeEntryCreateReq(TODAY, new BigDecimal("2"), "Noi dung", null));

		assertEquals(Boolean.TRUE, response.billable());
	}

	@Test
	void updatesBillableField() {
		stubOwnDraftEntry();
		when(timeEntryRepository.sumHoursByUserIdAndWorkDate(7L, TODAY)).thenReturn(new BigDecimal("2"));
		when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

		TimeEntryRes response = service.update(1L, 20L, 30L,
				new TimeEntryUpdateReq(new BigDecimal("3"), "Da chinh sua", false));

		assertEquals(Boolean.FALSE, response.billable());
	}

	private TimeEntry entry(Long id, Long taskId, LocalDate workDate, BigDecimal hours) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setTaskId(taskId);
		entry.setUserId(7L);
		entry.setWorkDate(workDate);
		entry.setHours(hours);
		entry.setBillable(true);
		entry.setStatus(TimeEntryStatus.DRAFT);
		return entry;
	}
}
