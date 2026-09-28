package com.serviceops.modules.expense;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.expense.dto.request.OverheadAllocationRunReq;
import com.serviceops.modules.expense.dto.response.OverheadAllocationRes;
import com.serviceops.modules.expense.entity.OverheadAllocation;
import com.serviceops.modules.expense.entity.OverheadPool;
import com.serviceops.modules.expense.repository.OverheadAllocationRepository;
import com.serviceops.modules.expense.repository.OverheadPoolRepository;
import com.serviceops.modules.expense.service.impl.OverheadAllocationServiceImpl;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-08-CN-005: kiem thu phan bo chi phi chung cho du an theo ty trong gio cong da duyet
 * (QTN-29).
 */
@ExtendWith(MockitoExtension.class)
class OverheadAllocationServiceTest {

	@Mock
	private OverheadPoolRepository overheadPoolRepository;
	@Mock
	private OverheadAllocationRepository overheadAllocationRepository;
	@Mock
	private TimeEntryRepository timeEntryRepository;
	@Mock
	private TaskRepository taskRepository;
	@Mock
	private AuditLogService auditLogService;

	private OverheadAllocationServiceImpl service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-30T08:00:00Z"), ZoneId.of("UTC"));
		service = new OverheadAllocationServiceImpl(overheadPoolRepository, overheadAllocationRepository,
				timeEntryRepository, taskRepository, auditLogService, clock);
	}

	private Task task(Long id, Long projectId) {
		Task task = new Task();
		task.setId(id);
		task.setProjectId(projectId);
		return task;
	}

	@Test
	void allocatesProportionallyToApprovedHoursAndRecordsAudit() {
		// Du an 1: task 10 -> 120 gio; Du an 2: task 20 -> 80 gio. Ty trong 60% / 40%.
		when(overheadPoolRepository.findByPeriodStart(LocalDate.of(2026, 9, 1))).thenReturn(Optional.empty());
		when(timeEntryRepository.sumApprovedHoursGroupByTaskIdBetween(LocalDate.of(2026, 9, 1),
				LocalDate.of(2026, 9, 30))).thenReturn(List.of(
						new Object[] {10L, new BigDecimal("120")},
						new Object[] {20L, new BigDecimal("80")}));
		when(taskRepository.findAllById(List.of(10L, 20L))).thenReturn(List.of(task(10L, 1L), task(20L, 2L)));
		when(overheadPoolRepository.save(any(OverheadPool.class))).thenAnswer(invocation -> {
			OverheadPool pool = invocation.getArgument(0);
			pool.setId(9L);
			return pool;
		});

		OverheadAllocationRunReq request = new OverheadAllocationRunReq(2026, 9, new BigDecimal("100000000"));
		OverheadAllocationRes response = service.run(request);

		assertEquals(9L, response.id());
		assertEquals(2, response.allocations().size());
		assertEquals(1L, response.allocations().get(0).projectId());
		assertEquals(new BigDecimal("60000000.00"), response.allocations().get(0).allocatedAmount());
		assertEquals(2L, response.allocations().get(1).projectId());
		assertEquals(new BigDecimal("40000000.00"), response.allocations().get(1).allocatedAmount());

		verify(overheadAllocationRepository, times(2)).save(any(OverheadAllocation.class));
		verify(auditLogService).record(eq("Phân bổ chi phí chung"), eq(AuditTargetType.EXPENSE), eq(9L),
				any(), any());
	}

	@Test
	void projectWithoutApprovedHoursInPeriodReceivesNoShare() {
		// Chi du an 1 co gio cong da duyet trong ky; du an 2 khong phat sinh gio cong nao.
		when(overheadPoolRepository.findByPeriodStart(LocalDate.of(2026, 9, 1))).thenReturn(Optional.empty());
		when(timeEntryRepository.sumApprovedHoursGroupByTaskIdBetween(LocalDate.of(2026, 9, 1),
				LocalDate.of(2026, 9, 30))).thenReturn(List.<Object[]>of(new Object[] {10L, new BigDecimal("50")}));
		when(taskRepository.findAllById(List.of(10L))).thenReturn(List.of(task(10L, 1L)));
		when(overheadPoolRepository.save(any(OverheadPool.class))).thenAnswer(invocation -> {
			OverheadPool pool = invocation.getArgument(0);
			pool.setId(11L);
			return pool;
		});

		OverheadAllocationRunReq request = new OverheadAllocationRunReq(2026, 9, new BigDecimal("50000000"));
		OverheadAllocationRes response = service.run(request);

		assertEquals(1, response.allocations().size());
		assertEquals(1L, response.allocations().get(0).projectId());
		assertEquals(new BigDecimal("50000000.00"), response.allocations().get(0).allocatedAmount());
	}

	@Test
	void rejectsWhenNoApprovedHoursInPeriodAtAll() {
		when(overheadPoolRepository.findByPeriodStart(LocalDate.of(2026, 9, 1))).thenReturn(Optional.empty());
		when(timeEntryRepository.sumApprovedHoursGroupByTaskIdBetween(any(), any())).thenReturn(List.of());

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.run(new OverheadAllocationRunReq(2026, 9, new BigDecimal("50000000"))));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(overheadPoolRepository, never()).save(any(OverheadPool.class));
		verify(auditLogService, never()).record(any(), any(), anyLong(), any(), any());
	}

	@Test
	void rejectsWhenPeriodAlreadyAllocated() {
		OverheadPool existing = new OverheadPool();
		existing.setId(1L);
		when(overheadPoolRepository.findByPeriodStart(LocalDate.of(2026, 9, 1))).thenReturn(Optional.of(existing));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.run(new OverheadAllocationRunReq(2026, 9, new BigDecimal("50000000"))));

		assertEquals(ErrorCode.DUPLICATE_DATA, exception.getErrorCode());
		verify(timeEntryRepository, never()).sumApprovedHoursGroupByTaskIdBetween(any(), any());
	}
}
