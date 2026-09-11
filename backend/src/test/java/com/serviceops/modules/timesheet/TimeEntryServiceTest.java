package com.serviceops.modules.timesheet;

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
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.mapper.TimeEntryMapper;
import com.serviceops.modules.timesheet.mapper.TimesheetMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.service.impl.TimeEntryServiceImpl;
import com.serviceops.modules.timesheet.validator.DailyHourLimitValidator;
import com.serviceops.modules.timesheet.validator.ImmutableEntryValidator;
import com.serviceops.modules.timesheet.validator.OpenPeriodValidator;
import com.serviceops.modules.timesheet.validator.OpenProjectValidator;
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
	private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock
	private ProjectAuditLogger auditLogger;

	private TimeEntryServiceImpl service;
	private Project project;
	private Task task;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-10T00:00:00Z"), ZoneId.of("UTC"));
		service = new TimeEntryServiceImpl(projectRepository, taskRepository, assignmentRepository,
				timeEntryRepository, currentUserScopeProvider, auditLogger,
				new OpenProjectValidator(), new OpenPeriodValidator(clock),
				new DailyHourLimitValidator(timeEntryRepository), new ImmutableEntryValidator(),
				new TimeEntryMapper(), new TimesheetMapper());

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
				new TimeEntryCreateReq(TODAY, new BigDecimal("3.5"), "Phan tich quy trinh"));

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

		assertThrows(AccessDeniedException.class, () -> service.create(1L, 20L,
				new TimeEntryCreateReq(TODAY, new BigDecimal("2"), null)));

		verify(timeEntryRepository, never()).save(any(TimeEntry.class));
	}

	@Test
	void rejectsTimeLoggingOnClosedProject() {
		project.setStatus(com.serviceops.modules.project.enums.ProjectStatus.CLOSED);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, 20L, new TimeEntryCreateReq(TODAY, new BigDecimal("2"), null)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void rejectsTimeLoggingInFuture() {
		stubAssigneeTask();

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, 20L,
						new TimeEntryCreateReq(TODAY.plusDays(1), new BigDecimal("2"), null)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void rejectsDuplicateEntryOnSameTaskSameDay() {
		stubAssigneeTask();
		TimeEntry existing = new TimeEntry();
		existing.setId(30L);
		when(timeEntryRepository.findByUserIdAndTaskIdAndWorkDate(7L, 20L, TODAY))
				.thenReturn(Optional.of(existing));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, 20L, new TimeEntryCreateReq(TODAY, new BigDecimal("2"), null)));

		assertEquals(ErrorCode.DUPLICATE_DATA, exception.getErrorCode());
	}

	@Test
	void rejectsLoggingMoreThanDailyHourLimit() {
		stubAssigneeTask();
		when(timeEntryRepository.sumHoursByUserIdAndWorkDate(7L, TODAY)).thenReturn(new BigDecimal("11.5"));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, 20L, new TimeEntryCreateReq(TODAY, new BigDecimal("1"), null)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
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
				new TimeEntryUpdateReq(new BigDecimal("3"), "Da chinh sua"));

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
				() -> service.update(1L, 20L, 30L, new TimeEntryUpdateReq(new BigDecimal("3"), null)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void rejectsUpdateOfOthersEntry() {
		TimeEntry entry = stubOwnDraftEntry();
		entry.setUserId(8L);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.update(1L, 20L, 30L, new TimeEntryUpdateReq(new BigDecimal("3"), null)));

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

	private TimeEntry entry(Long id, Long taskId, LocalDate workDate, BigDecimal hours) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setTaskId(taskId);
		entry.setUserId(7L);
		entry.setWorkDate(workDate);
		entry.setHours(hours);
		entry.setStatus(TimeEntryStatus.DRAFT);
		return entry;
	}
}
