package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.mapper.TimesheetMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.repository.TimesheetRepository;
import com.serviceops.modules.timesheet.service.impl.TimesheetSubmitServiceImpl;
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
 * Unit test nghiep vu nop bang cham cong tuan (NCL-06-CN-002).
 *
 * <p>Dong ho fix 2026-09-13 de submittedAt khong flaky theo ngay chay test.</p>
 */
@ExtendWith(MockitoExtension.class)
class TimesheetSubmitServiceTest {

	private static final LocalDate WEEK_FROM = LocalDate.of(2026, 9, 7);
	private static final LocalDate WEEK_TO = LocalDate.of(2026, 9, 13);

	@Mock
	private TimeEntryRepository timeEntryRepository;
	@Mock
	private TimesheetRepository timesheetRepository;
	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock
	private AuditLogService auditLogService;

	private TimesheetSubmitServiceImpl service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-13T10:00:00Z"), ZoneId.of("UTC"));
		service = new TimesheetSubmitServiceImpl(timeEntryRepository, timesheetRepository,
				currentUserScopeProvider, auditLogService, new TimesheetMapper(), clock);
	}

	private TimeEntry draftEntry(Long id, Long taskId, LocalDate workDate, BigDecimal hours) {
		TimeEntry entry = new TimeEntry();
		entry.setId(id);
		entry.setTaskId(taskId);
		entry.setUserId(7L);
		entry.setWorkDate(workDate);
		entry.setHours(hours);
		entry.setStatus(TimeEntryStatus.DRAFT);
		return entry;
	}

	private void stubWeekEntries(List<TimeEntry> entries) {
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(7L, WEEK_FROM, WEEK_TO))
				.thenReturn(entries);
	}

	private void stubPersistence() {
		when(timeEntryRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
		when(timesheetRepository.save(any(Timesheet.class))).thenAnswer(invocation -> {
			Timesheet saved = invocation.getArgument(0);
			saved.setId(50L);
			return saved;
		});
	}

	@Test
	void submitsWeekTransferringDraftsToPendingApproval() {
		TimeEntry entry1 = draftEntry(30L, 20L, WEEK_FROM, new BigDecimal("5"));
		TimeEntry entry2 = draftEntry(31L, 21L, WEEK_FROM, new BigDecimal("3"));
		stubWeekEntries(List.of(entry1, entry2));
		stubPersistence();
		when(timesheetRepository.findByUserIdAndWeekStartDate(7L, WEEK_FROM)).thenReturn(Optional.empty());
		when(timesheetRepository.sumHoursPerDayBetween(7L, WEEK_FROM, WEEK_TO))
				.thenReturn(List.<Object[]>of(new Object[] { WEEK_FROM, new BigDecimal("8") }));

		TimesheetRes response = service.submit(WEEK_FROM, WEEK_TO);

		assertEquals(50L, response.id());
		assertEquals(TimesheetStatus.PENDING_APPROVAL, response.status());
		assertEquals(new BigDecimal("8"), response.totalHours());
		assertEquals(TimeEntryStatus.SUBMITTED, entry1.getStatus());
		assertEquals(TimeEntryStatus.SUBMITTED, entry2.getStatus());
		verify(auditLogService).record(eq("Nop bang cham cong tuan"), eq(AuditTargetType.GENERAL),
				eq(50L), eq("Bang cham cong tuan"), contains("8 gio"));
	}

	@Test
	void rejectsSubmitWhenWeekHasNoTimeEntries() {
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);
		when(timeEntryRepository.findByUserIdAndWorkDateBetweenOrderByIdAsc(7L, WEEK_FROM, WEEK_TO))
				.thenReturn(List.of());

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.submit(WEEK_FROM, WEEK_TO));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void rejectsSubmitWhenWeekHasNoDraftEntryLeft() {
		TimeEntry submitted = draftEntry(30L, 20L, WEEK_FROM, new BigDecimal("4"));
		submitted.setStatus(TimeEntryStatus.SUBMITTED);
		stubWeekEntries(List.of(submitted));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.submit(WEEK_FROM, WEEK_TO));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	@Test
	void blocksSubmitWhenADayExceedsTwelveHours() {
		stubWeekEntries(List.of(draftEntry(30L, 20L, WEEK_FROM, new BigDecimal("14"))));
		when(timesheetRepository.findByUserIdAndWeekStartDate(7L, WEEK_FROM)).thenReturn(Optional.empty());
		when(timesheetRepository.sumHoursPerDayBetween(7L, WEEK_FROM, WEEK_TO))
				.thenReturn(List.<Object[]>of(new Object[] { LocalDate.of(2026, 9, 10), new BigDecimal("14") }));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.submit(WEEK_FROM, WEEK_TO));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		assertTrue(exception.getMessage().contains("2026-09-10 (14 gio)"));
		verify(timeEntryRepository, never()).saveAll(anyList());
	}

	@Test
	void rejectsResubmitOfPendingApprovalWeek() {
		stubWeekEntries(List.of(draftEntry(30L, 20L, WEEK_FROM, new BigDecimal("4"))));
		Timesheet existing = new Timesheet();
		existing.setId(50L);
		existing.setStatus(TimesheetStatus.PENDING_APPROVAL);
		when(timesheetRepository.findByUserIdAndWeekStartDate(7L, WEEK_FROM))
				.thenReturn(Optional.of(existing));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.submit(WEEK_FROM, WEEK_TO));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(timesheetRepository, never()).save(any(Timesheet.class));
	}

	@Test
	void allowsResubmitOfRejectedWeekReusingSameRow() {
		TimeEntry entry = draftEntry(30L, 20L, WEEK_FROM, new BigDecimal("4"));
		stubWeekEntries(List.of(entry));
		stubPersistence();
		Timesheet rejected = new Timesheet();
		rejected.setId(50L);
		rejected.setStatus(TimesheetStatus.REJECTED);
		when(timesheetRepository.findByUserIdAndWeekStartDate(7L, WEEK_FROM))
				.thenReturn(Optional.of(rejected));
		when(timesheetRepository.sumHoursPerDayBetween(7L, WEEK_FROM, WEEK_TO))
				.thenReturn(List.<Object[]>of(new Object[] { WEEK_FROM, new BigDecimal("4") }));

		TimesheetRes response = service.submit(WEEK_FROM, WEEK_TO);

		assertEquals(50L, response.id());
		assertEquals(TimesheetStatus.PENDING_APPROVAL, response.status());
		assertEquals(TimeEntryStatus.SUBMITTED, entry.getStatus());
	}

	@Test
	void rejectsWeekRangeWhereEndPrecedesStart() {
		assertThrows(BusinessRuleException.class,
				() -> service.submit(WEEK_TO, WEEK_FROM));
	}
}
