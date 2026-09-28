package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.timesheet.dto.request.PeriodLockReq;
import com.serviceops.modules.timesheet.dto.response.TimesheetPeriodRes;
import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.entity.TimesheetPeriod;
import com.serviceops.modules.timesheet.enums.PeriodStatus;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.repository.TimesheetPeriodRepository;
import com.serviceops.modules.timesheet.repository.TimesheetRepository;
import com.serviceops.modules.timesheet.service.impl.TimesheetPeriodServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test nghiep vu khoa/mo ky cham cong (NCL-06-CN-006).
 */
@ExtendWith(MockitoExtension.class)
class TimesheetPeriodServiceTest {

	private static final LocalDate PERIOD_START = LocalDate.of(2026, 9, 1);
	private static final LocalDate PERIOD_END = LocalDate.of(2026, 9, 30);

	@Mock
	private TimesheetPeriodRepository periodRepository;
	@Mock
	private TimesheetRepository timesheetRepository;
	@Mock
	private AuditLogService auditLogService;

	private TimesheetPeriodServiceImpl service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneId.of("UTC"));
		service = new TimesheetPeriodServiceImpl(periodRepository, timesheetRepository, auditLogService, clock);
	}

	/** TC-01: moi bang cham cong trong ky da duyet — khoa ky thanh cong. */
	@Test
	void locksPeriodWhenNoPendingTimesheets() {
		when(periodRepository.findByPeriodStart(PERIOD_START)).thenReturn(Optional.empty());
		when(timesheetRepository.findOverlappingByStatus(TimesheetStatus.PENDING_APPROVAL, PERIOD_START, PERIOD_END))
				.thenReturn(List.of());
		when(periodRepository.save(any(TimesheetPeriod.class))).thenAnswer(invocation -> {
			TimesheetPeriod period = invocation.getArgument(0);
			period.setId(1L);
			return period;
		});

		TimesheetPeriodRes result = service.lock(new PeriodLockReq(2026, 9));

		assertEquals(PeriodStatus.LOCKED, result.status());
		assertEquals(PERIOD_START, result.periodStart());
		assertEquals(PERIOD_END, result.periodEnd());
		verify(auditLogService).record(eq("Khoa ky cham cong"), eq(AuditTargetType.GENERAL), eq(1L),
				any(), contains("da khoa"));
	}

	/** TC-02: con bang cham cong cho duyet trong ky — chan khoa va liet ke bang con treo. */
	@Test
	void rejectsLockWhenPendingTimesheetsExist() {
		when(periodRepository.findByPeriodStart(PERIOD_START)).thenReturn(Optional.empty());
		Timesheet pending = new Timesheet();
		pending.setId(77L);
		pending.setUserId(7L);
		pending.setWeekStartDate(LocalDate.of(2026, 9, 7));
		pending.setWeekEndDate(LocalDate.of(2026, 9, 13));
		when(timesheetRepository.findOverlappingByStatus(TimesheetStatus.PENDING_APPROVAL, PERIOD_START, PERIOD_END))
				.thenReturn(List.of(pending));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.lock(new PeriodLockReq(2026, 9)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		assertTrue(exception.getMessage().contains("#77"));
		verify(periodRepository, never()).save(any(TimesheetPeriod.class));
	}

	/** Ky da khoa tu truoc thi khong khoa lai duoc. */
	@Test
	void rejectsLockingAnAlreadyLockedPeriod() {
		TimesheetPeriod existing = new TimesheetPeriod();
		existing.setId(1L);
		existing.setPeriodStart(PERIOD_START);
		existing.setPeriodEnd(PERIOD_END);
		existing.setStatus(PeriodStatus.LOCKED);
		when(periodRepository.findByPeriodStart(PERIOD_START)).thenReturn(Optional.of(existing));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.lock(new PeriodLockReq(2026, 9)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}

	/** TC-04: mo lai ky da khoa ghi nhat ky. */
	@Test
	void unlocksLockedPeriodAndRecordsAudit() {
		TimesheetPeriod locked = new TimesheetPeriod();
		locked.setId(1L);
		locked.setPeriodStart(PERIOD_START);
		locked.setPeriodEnd(PERIOD_END);
		locked.setStatus(PeriodStatus.LOCKED);
		locked.setLockedBy("ketoan01");
		when(periodRepository.findById(1L)).thenReturn(Optional.of(locked));
		when(periodRepository.save(any(TimesheetPeriod.class))).thenAnswer(invocation -> invocation.getArgument(0));

		TimesheetPeriodRes result = service.unlock(1L);

		assertEquals(PeriodStatus.OPEN, result.status());
		verify(auditLogService).record(eq("Mo lai ky cham cong"), eq(AuditTargetType.GENERAL), eq(1L),
				any(), contains("da mo lai"));
	}

	/** Khong mo lai duoc ky dang mo (chua tung khoa). */
	@Test
	void rejectsUnlockingAnOpenPeriod() {
		TimesheetPeriod open = new TimesheetPeriod();
		open.setId(1L);
		open.setStatus(PeriodStatus.OPEN);
		when(periodRepository.findById(1L)).thenReturn(Optional.of(open));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class, () -> service.unlock(1L));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
	}
}
