package com.serviceops.modules.expense;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.expense.dto.request.ExpenseBillableReq;
import com.serviceops.modules.expense.dto.request.ExpenseCreateReq;
import com.serviceops.modules.expense.dto.request.ExpenseRejectReq;
import com.serviceops.modules.expense.dto.response.ExpenseRes;
import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.enums.ExpenseType;
import com.serviceops.modules.expense.mapper.ExpenseMapper;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.expense.service.impl.ProjectExpenseServiceImpl;
import com.serviceops.modules.expense.validator.ExpenseProjectStateValidator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectExpenseServiceTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 9, 10);

	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private ProjectExpenseRepository expenseRepository;
	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock
	private ProjectAuditLogger auditLogger;

	private ProjectExpenseServiceImpl service;
	private Project project;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-10T08:00:00Z"), ZoneId.of("UTC"));
		service = new ProjectExpenseServiceImpl(projectRepository, expenseRepository, currentUserScopeProvider,
				new ExpenseProjectStateValidator(), new ExpenseMapper(), auditLogger, clock);
		project = new Project();
		project.setId(1L);
		project.setStatus(com.serviceops.modules.project.enums.ProjectStatus.RUNNING);
	}

	private ExpenseCreateReq request(LocalDate date) {
		return new ExpenseCreateReq(ExpenseType.TRAVEL, new BigDecimal("2000000"), date,
				"Chi phi di lai gap khach hang", "https://files.example/receipt-1.pdf", null);
	}

	@Test
	void createsSubmittedExpenseForCurrentUser() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);
		when(expenseRepository.save(any(ProjectExpense.class))).thenAnswer(invocation -> {
			ProjectExpense saved = invocation.getArgument(0);
			saved.setId(30L);
			return saved;
		});

		ExpenseRes response = service.create(1L, request(TODAY));

		assertEquals(30L, response.id());
		assertEquals(1L, response.projectId());
		assertEquals(7L, response.userId());
		assertEquals(ExpenseType.TRAVEL, response.type());
		assertEquals(new BigDecimal("2000000"), response.amount());
		assertEquals(Boolean.FALSE, response.billable());
		assertEquals(ExpenseStatus.SUBMITTED, response.status());
		verify(auditLogger).recordExpenseCreated(1L, 30L, new BigDecimal("2000000"));
	}

	@Test
	void rejectsExpenseForClosedProject() {
		project.setStatus(com.serviceops.modules.project.enums.ProjectStatus.CLOSED);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, request(TODAY)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(expenseRepository, never()).save(any(ProjectExpense.class));
	}

	@Test
	void rejectsFutureExpenseDate() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, request(TODAY.plusDays(1))));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(expenseRepository, never()).save(any(ProjectExpense.class));
	}

	@Test
	void approvesSubmittedExpenseAndRecordsAudit() {
		ProjectExpense expense = expense(ExpenseStatus.SUBMITTED);
		when(currentUserScopeProvider.currentUserId()).thenReturn(5L);
		when(expenseRepository.findById(30L)).thenReturn(Optional.of(expense));
		when(expenseRepository.save(expense)).thenReturn(expense);

		ExpenseRes response = service.approve(30L);

		assertEquals(ExpenseStatus.APPROVED, response.status());
		assertEquals(ExpenseStatus.APPROVED, expense.getStatus());
		assertEquals(LocalDateTime.parse("2026-09-10T08:00:00"), expense.getApprovedAt());
		verify(auditLogger).recordExpenseApproved(1L, 30L, new BigDecimal("2000000"));
	}

	@Test
	void rejectsSubmittedExpenseWithReasonAndRecordsAudit() {
		ProjectExpense expense = expense(ExpenseStatus.SUBMITTED);
		when(currentUserScopeProvider.currentUserId()).thenReturn(5L);
		when(expenseRepository.findById(30L)).thenReturn(Optional.of(expense));
		when(expenseRepository.save(expense)).thenReturn(expense);

		ExpenseRes response = service.reject(30L, new ExpenseRejectReq("  Thieu chung tu  "));

		assertEquals(ExpenseStatus.REJECTED, response.status());
		assertEquals("Thieu chung tu", expense.getRejectReason());
		verify(auditLogger).recordExpenseRejected(1L, 30L, "Thieu chung tu");
	}

	@Test
	void cannotApproveExpenseThatWasAlreadyRejected() {
		ProjectExpense expense = expense(ExpenseStatus.REJECTED);
		when(currentUserScopeProvider.currentUserId()).thenReturn(5L);
		when(expenseRepository.findById(30L)).thenReturn(Optional.of(expense));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.approve(30L));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(expenseRepository, never()).save(any(ProjectExpense.class));
	}

	@Test
	void creatorCanEditRejectedExpenseAndResubmit() {
		ProjectExpense expense = expense(ExpenseStatus.REJECTED);
		expense.setUserId(7L);
		expense.setRejectReason("Thieu chung tu");
		when(currentUserScopeProvider.currentUserId()).thenReturn(7L);
		when(expenseRepository.findById(30L)).thenReturn(Optional.of(expense));
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
		when(expenseRepository.save(expense)).thenReturn(expense);

		ExpenseRes response = service.updateRejected(30L, request(TODAY));

		assertEquals(ExpenseStatus.SUBMITTED, response.status());
		assertEquals(null, expense.getRejectReason());
		verify(auditLogger).recordExpenseResubmitted(1L, 30L);
	}

	@Test
	void projectManagerCanMarkApprovedExpenseAsBillable() {
		ProjectExpense expense = expense(ExpenseStatus.APPROVED);
		when(currentUserScopeProvider.currentUserId()).thenReturn(5L);
		when(expenseRepository.findById(30L)).thenReturn(Optional.of(expense));
		when(expenseRepository.save(expense)).thenReturn(expense);

		ExpenseRes response = service.updateBillable(30L, new ExpenseBillableReq(true));

		assertEquals(Boolean.TRUE, response.billable());
		assertEquals(Boolean.TRUE, expense.getBillable());
		verify(auditLogger).recordExpenseBillableUpdated(1L, 30L, true);
	}

	@Test
	void cannotMarkSubmittedExpenseAsBillable() {
		ProjectExpense expense = expense(ExpenseStatus.SUBMITTED);
		when(currentUserScopeProvider.currentUserId()).thenReturn(5L);
		when(expenseRepository.findById(30L)).thenReturn(Optional.of(expense));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.updateBillable(30L, new ExpenseBillableReq(true)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(expenseRepository, never()).save(any(ProjectExpense.class));
		verify(auditLogger, never()).recordExpenseBillableUpdated(any(), any(), any());
	}

	@Test
	void cannotUnmarkExpenseAlreadyIncludedInInvoice() {
		ProjectExpense expense = expense(ExpenseStatus.APPROVED);
		expense.setBillable(true);
		expense.setInvoiced(true);
		when(currentUserScopeProvider.currentUserId()).thenReturn(5L);
		when(expenseRepository.findById(30L)).thenReturn(Optional.of(expense));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.updateBillable(30L, new ExpenseBillableReq(false)));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(expenseRepository, never()).save(any(ProjectExpense.class));
		verify(auditLogger, never()).recordExpenseBillableUpdated(any(), any(), any());
	}

	private ProjectExpense expense(ExpenseStatus status) {
		ProjectExpense expense = new ProjectExpense();
		expense.setId(30L);
		expense.setProjectId(1L);
		expense.setAmount(new BigDecimal("2000000"));
		expense.setStatus(status);
		return expense;
	}
}
