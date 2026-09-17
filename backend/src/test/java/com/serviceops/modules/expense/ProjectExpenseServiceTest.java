package com.serviceops.modules.expense;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.expense.dto.request.ExpenseCreateReq;
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
}
