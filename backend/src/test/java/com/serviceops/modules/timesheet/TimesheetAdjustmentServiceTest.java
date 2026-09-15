package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.dto.request.TimeEntryAdjustmentReq;
import com.serviceops.modules.timesheet.dto.response.AdjustmentTraceRes;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.entity.TimeEntryAdjustment;
import com.serviceops.modules.timesheet.entity.TimesheetPeriod;
import com.serviceops.modules.timesheet.enums.PeriodStatus;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.TimeEntryType;
import com.serviceops.modules.timesheet.mapper.TimeEntryMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryAdjustmentRepository;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.repository.TimesheetPeriodRepository;
import com.serviceops.modules.timesheet.service.impl.TimesheetAdjustmentServiceImpl;
import com.serviceops.modules.timesheet.validator.PeriodLockValidator;
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
 * Unit test nghiep vu dieu chinh gio cong da duyet bang but toan dao (NCL-06-CN-005).
 */
@ExtendWith(MockitoExtension.class)
class TimesheetAdjustmentServiceTest {

	private static final Long PROJECT_ID = 1L;
	private static final Long TASK_ID = 20L;
	private static final Long ENTRY_ID = 100L;
	private static final Long PM_ID = 2L;
	private static final Long MEMBER_ID = 7L;
	private static final LocalDate WORK_DATE = LocalDate.of(2026, 9, 10);

	@Mock
	private TimeEntryRepository timeEntryRepository;
	@Mock
	private TimeEntryAdjustmentRepository adjustmentRepository;
	@Mock
	private TaskRepository taskRepository;
	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock
	private TimesheetPeriodRepository periodRepository;
	@Mock
	private AuditLogService auditLogService;

	private TimesheetAdjustmentServiceImpl service;
	private Project project;
	private Task task;
	private TimeEntry original;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-14T10:00:00Z"), ZoneId.of("UTC"));
		PeriodLockValidator periodLockValidator = new PeriodLockValidator(periodRepository);
		service = new TimesheetAdjustmentServiceImpl(timeEntryRepository, adjustmentRepository, taskRepository,
				projectRepository, currentUserScopeProvider, periodLockValidator, auditLogService,
				new TimeEntryMapper(), clock);

		project = new Project();
		project.setId(PROJECT_ID);
		project.setProjectManagerId(PM_ID);

		task = new Task();
		task.setId(TASK_ID);
		task.setProjectId(PROJECT_ID);
		task.setName("Thiet ke API");
		task.setApprovedHours(new BigDecimal("8"));

		original = new TimeEntry();
		original.setId(ENTRY_ID);
		original.setTaskId(TASK_ID);
		original.setUserId(MEMBER_ID);
		original.setWorkDate(WORK_DATE);
		original.setHours(new BigDecimal("8"));
		original.setStatus(TimeEntryStatus.APPROVED);
		original.setType(TimeEntryType.ORIGINAL);
		original.setBillable(true);

		when(currentUserScopeProvider.currentUserId()).thenReturn(PM_ID);
		when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
		when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(task));
	}

	/** TC-01: sinh dong dao (-8) va dong sua (6), dong goc giu nguyen. */
	@Test
	void adjustCreatesReversalAndCorrectedEntriesKeepingOriginalUnchanged() {
		when(timeEntryRepository.findById(ENTRY_ID)).thenReturn(Optional.of(original));
		when(periodRepository.findByDate(WORK_DATE)).thenReturn(Optional.empty());
		when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(invocation -> {
			TimeEntry entry = invocation.getArgument(0);
			if (entry.getId() == null) {
				entry.setId(entry.getType() == TimeEntryType.REVERSAL ? 101L : 102L);
			}
			return entry;
		});
		when(timeEntryRepository.sumHoursByTaskIdAndStatusIn(eq(TASK_ID), anyList()))
				.thenReturn(new BigDecimal("6"));
		when(adjustmentRepository.save(any(TimeEntryAdjustment.class))).thenAnswer(invocation -> {
			TimeEntryAdjustment adjustment = invocation.getArgument(0);
			adjustment.setId(500L);
			return adjustment;
		});

		AdjustmentTraceRes result = service.adjust(PROJECT_ID, TASK_ID, ENTRY_ID,
				new TimeEntryAdjustmentReq(new BigDecimal("6"), "Ghi nham gio, thuc te chi lam 6 gio"));

		assertEquals(new BigDecimal("8"), result.originalEntry().hours());
		assertEquals(TimeEntryStatus.APPROVED, original.getStatus());
		assertEquals(TimeEntryType.ORIGINAL, original.getType());

		assertEquals(new BigDecimal("-8"), result.reversalEntry().hours());
		assertEquals(new BigDecimal("6"), result.correctedEntry().hours());
		assertEquals("Ghi nham gio, thuc te chi lam 6 gio", result.reason());

		assertEquals(new BigDecimal("6"), task.getApprovedHours());
		verify(adjustmentRepository).save(any(TimeEntryAdjustment.class));
	}

	/** TC-01 (Given): chi dieu chinh duoc dong da duyet — dong con DRAFT/SUBMITTED bi tu choi. */
	@Test
	void rejectsAdjustmentWhenEntryNotApproved() {
		original.setStatus(TimeEntryStatus.SUBMITTED);
		when(timeEntryRepository.findById(ENTRY_ID)).thenReturn(Optional.of(original));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.adjust(PROJECT_ID, TASK_ID, ENTRY_ID,
						new TimeEntryAdjustmentReq(new BigDecimal("6"), "ly do")));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(timeEntryRepository, never()).save(any(TimeEntry.class));
	}

	/** Khong dieu chinh chong len mot dong da la dong dao/sua cua lan dieu chinh truoc. */
	@Test
	void rejectsAdjustmentOnNonOriginalEntry() {
		original.setType(TimeEntryType.CORRECTION);
		when(timeEntryRepository.findById(ENTRY_ID)).thenReturn(Optional.of(original));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.adjust(PROJECT_ID, TASK_ID, ENTRY_ID,
						new TimeEntryAdjustmentReq(new BigDecimal("6"), "ly do")));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	/** TC-02: PM khong quan ly du an nay khong dieu chinh duoc (giong quy tac cua NCL-06-CN-003/004). */
	@Test
	void rejectsAdjustmentWhenNotManagingProject() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(99L);

		assertThrows(AccessDeniedException.class,
				() -> service.adjust(PROJECT_ID, TASK_ID, ENTRY_ID,
						new TimeEntryAdjustmentReq(new BigDecimal("6"), "ly do")));

		verify(timeEntryRepository, never()).findById(ENTRY_ID);
	}

	/** TC-03: ky cham cong chua ngay cua dong goc da bi khoa thi chan dieu chinh. */
	@Test
	void rejectsAdjustmentWhenPeriodLocked() {
		when(timeEntryRepository.findById(ENTRY_ID)).thenReturn(Optional.of(original));
		TimesheetPeriod lockedPeriod = new TimesheetPeriod();
		lockedPeriod.setPeriodStart(LocalDate.of(2026, 9, 1));
		lockedPeriod.setPeriodEnd(LocalDate.of(2026, 9, 30));
		lockedPeriod.setStatus(PeriodStatus.LOCKED);
		when(periodRepository.findByDate(WORK_DATE)).thenReturn(Optional.of(lockedPeriod));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.adjust(PROJECT_ID, TASK_ID, ENTRY_ID,
						new TimeEntryAdjustmentReq(new BigDecimal("6"), "ly do")));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		assertTrue(exception.getMessage().contains("da bi khoa"));
		verify(timeEntryRepository, never()).save(any(TimeEntry.class));
	}

	/** TC-04: moi lan dieu chinh deu ghi Nhat ky he thong. */
	@Test
	void recordsAuditLogOnAdjustment() {
		when(timeEntryRepository.findById(ENTRY_ID)).thenReturn(Optional.of(original));
		when(periodRepository.findByDate(WORK_DATE)).thenReturn(Optional.empty());
		when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(invocation -> {
			TimeEntry entry = invocation.getArgument(0);
			if (entry.getId() == null) {
				entry.setId(entry.getType() == TimeEntryType.REVERSAL ? 101L : 102L);
			}
			return entry;
		});
		when(timeEntryRepository.sumHoursByTaskIdAndStatusIn(eq(TASK_ID), anyList()))
				.thenReturn(new BigDecimal("6"));
		when(adjustmentRepository.save(any(TimeEntryAdjustment.class))).thenAnswer(invocation -> {
			TimeEntryAdjustment adjustment = invocation.getArgument(0);
			adjustment.setId(500L);
			return adjustment;
		});

		service.adjust(PROJECT_ID, TASK_ID, ENTRY_ID,
				new TimeEntryAdjustmentReq(new BigDecimal("6"), "Ghi nham gio"));

		verify(auditLogService).record(contains("Dieu chinh"), eq(AuditTargetType.GENERAL), eq(TASK_ID),
				any(), contains("Ghi nham gio"));
	}

	/** "Tra cuu duoc": lich su dieu chinh cua cong viec doc lai dung ca ba dong. */
	@Test
	void findHistoryReturnsTraceWithAllThreeEntries() {
		TimeEntry reversal = new TimeEntry();
		reversal.setId(101L);
		reversal.setTaskId(TASK_ID);
		reversal.setUserId(MEMBER_ID);
		reversal.setWorkDate(WORK_DATE);
		reversal.setHours(new BigDecimal("-8"));
		reversal.setStatus(TimeEntryStatus.APPROVED);
		reversal.setType(TimeEntryType.REVERSAL);
		reversal.setBillable(true);

		TimeEntry corrected = new TimeEntry();
		corrected.setId(102L);
		corrected.setTaskId(TASK_ID);
		corrected.setUserId(MEMBER_ID);
		corrected.setWorkDate(WORK_DATE);
		corrected.setHours(new BigDecimal("6"));
		corrected.setStatus(TimeEntryStatus.APPROVED);
		corrected.setType(TimeEntryType.CORRECTION);
		corrected.setBillable(true);

		TimeEntryAdjustment adjustment = new TimeEntryAdjustment();
		adjustment.setId(500L);
		adjustment.setOriginalEntryId(ENTRY_ID);
		adjustment.setReversalEntryId(101L);
		adjustment.setCorrectedEntryId(102L);
		adjustment.setReason("Ghi nham gio");

		when(adjustmentRepository.findByTaskIdOrderByAdjustedAtDesc(TASK_ID)).thenReturn(List.of(adjustment));
		when(timeEntryRepository.findById(ENTRY_ID)).thenReturn(Optional.of(original));
		when(timeEntryRepository.findById(101L)).thenReturn(Optional.of(reversal));
		when(timeEntryRepository.findById(102L)).thenReturn(Optional.of(corrected));

		List<AdjustmentTraceRes> history = service.findHistory(PROJECT_ID, TASK_ID);

		assertEquals(1, history.size());
		assertEquals(new BigDecimal("8"), history.get(0).originalEntry().hours());
		assertEquals(new BigDecimal("-8"), history.get(0).reversalEntry().hours());
		assertEquals(new BigDecimal("6"), history.get(0).correctedEntry().hours());
	}
}
