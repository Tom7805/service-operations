package com.serviceops.modules.expense;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.expense.dto.request.ExpenseRejectReq;
import com.serviceops.modules.expense.dto.request.SubcontractorExpenseReq;
import com.serviceops.modules.expense.dto.response.SubcontractorExpenseRes;
import com.serviceops.modules.expense.entity.SubcontractorExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.mapper.ExpenseMapper;
import com.serviceops.modules.expense.repository.SubcontractorExpenseRepository;
import com.serviceops.modules.expense.service.impl.SubcontractorExpenseServiceImpl;
import com.serviceops.modules.expense.validator.ExpenseProjectStateValidator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.enums.ProjectStatus;
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

/** NCL-08-CN-004: kiem thu ghi nhan chi phi thue ngoai. */
@ExtendWith(MockitoExtension.class)
class SubcontractorExpenseServiceTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 9, 10);

	@Mock
	private ProjectRepository projectRepository;
	@Mock
	private SubcontractorExpenseRepository expenseRepository;
	@Mock
	private CurrentUserScopeProvider currentUserScopeProvider;
	@Mock
	private ProjectAuditLogger auditLogger;

	private SubcontractorExpenseServiceImpl service;
	private Project project;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-10T08:00:00Z"), ZoneId.of("UTC"));
		service = new SubcontractorExpenseServiceImpl(projectRepository, expenseRepository,
				currentUserScopeProvider, new ExpenseProjectStateValidator(), new ExpenseMapper(), auditLogger,
				clock);
		project = new Project();
		project.setId(1L);
		project.setStatus(ProjectStatus.RUNNING);
	}

	private SubcontractorExpenseReq request() {
		return new SubcontractorExpenseReq("Cong ty TNHH ABC", "Trien khai module bao cao",
				new BigDecimal("50000000"), TODAY);
	}

	@Test
	void createsSubmittedExpenseForCurrentUser() {
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));
		when(currentUserScopeProvider.currentUserId()).thenReturn(5L);
		when(expenseRepository.save(any(SubcontractorExpense.class))).thenAnswer(invocation -> {
			SubcontractorExpense saved = invocation.getArgument(0);
			saved.setId(40L);
			return saved;
		});

		SubcontractorExpenseRes response = service.create(1L, request());

		assertEquals(40L, response.id());
		assertEquals(1L, response.projectId());
		assertEquals(5L, response.userId());
		assertEquals("Cong ty TNHH ABC", response.contractorName());
		assertEquals("Trien khai module bao cao", response.workScope());
		assertEquals(new BigDecimal("50000000"), response.amount());
		assertEquals(ExpenseStatus.SUBMITTED, response.status());
		verify(auditLogger).recordSubcontractorExpenseCreated(1L, 40L, "Cong ty TNHH ABC",
				new BigDecimal("50000000"));
	}

	@Test
	void rejectsExpenseForClosedProject() {
		project.setStatus(ProjectStatus.CLOSED);
		when(projectRepository.findById(1L)).thenReturn(Optional.of(project));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(1L, request()));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(expenseRepository, never()).save(any(SubcontractorExpense.class));
	}

	@Test
	void rejectsWhenProjectNotFound() {
		when(projectRepository.findById(99L)).thenReturn(Optional.empty());

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.create(99L, request()));

		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, exception.getErrorCode());
	}

	@Test
	void approvesSubmittedExpenseAndRecordsAudit() {
		SubcontractorExpense expense = expense(ExpenseStatus.SUBMITTED);
		when(currentUserScopeProvider.currentUserId()).thenReturn(9L);
		when(expenseRepository.findById(40L)).thenReturn(Optional.of(expense));
		when(expenseRepository.save(expense)).thenReturn(expense);

		SubcontractorExpenseRes response = service.approve(40L);

		assertEquals(ExpenseStatus.APPROVED, response.status());
		assertEquals(LocalDateTime.parse("2026-09-10T08:00:00"), expense.getApprovedAt());
		verify(auditLogger).recordSubcontractorExpenseApproved(1L, 40L, new BigDecimal("50000000"));
	}

	@Test
	void cannotApproveExpenseThatWasAlreadyApproved() {
		SubcontractorExpense expense = expense(ExpenseStatus.APPROVED);
		when(currentUserScopeProvider.currentUserId()).thenReturn(9L);
		when(expenseRepository.findById(40L)).thenReturn(Optional.of(expense));

		BusinessRuleException exception = assertThrows(BusinessRuleException.class,
				() -> service.approve(40L));

		assertEquals(ErrorCode.INVALID_STATE, exception.getErrorCode());
		verify(expenseRepository, never()).save(any(SubcontractorExpense.class));
	}

	@Test
	void rejectsSubmittedExpenseWithReasonAndRecordsAudit() {
		SubcontractorExpense expense = expense(ExpenseStatus.SUBMITTED);
		when(currentUserScopeProvider.currentUserId()).thenReturn(9L);
		when(expenseRepository.findById(40L)).thenReturn(Optional.of(expense));
		when(expenseRepository.save(expense)).thenReturn(expense);

		SubcontractorExpenseRes response = service.reject(40L, new ExpenseRejectReq("  Thieu hop dong  "));

		assertEquals(ExpenseStatus.REJECTED, response.status());
		assertEquals("Thieu hop dong", expense.getRejectReason());
		verify(auditLogger).recordSubcontractorExpenseRejected(1L, 40L, "Thieu hop dong");
	}

	private SubcontractorExpense expense(ExpenseStatus status) {
		SubcontractorExpense expense = new SubcontractorExpense();
		expense.setId(40L);
		expense.setProjectId(1L);
		expense.setContractorName("Cong ty TNHH ABC");
		expense.setAmount(new BigDecimal("50000000"));
		expense.setStatus(status);
		return expense;
	}
}
