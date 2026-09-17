package com.serviceops.modules.expense.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.expense.dto.request.ExpenseCreateReq;
import com.serviceops.modules.expense.dto.response.ExpenseRes;
import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.mapper.ExpenseMapper;
import com.serviceops.modules.expense.repository.ProjectExpenseRepository;
import com.serviceops.modules.expense.service.ProjectExpenseService;
import com.serviceops.modules.expense.validator.ExpenseProjectStateValidator;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.logging.ProjectAuditLogger;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectExpenseServiceImpl implements ProjectExpenseService {

	private final ProjectRepository projectRepository;
	private final ProjectExpenseRepository expenseRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final ExpenseProjectStateValidator projectStateValidator;
	private final ExpenseMapper expenseMapper;
	private final ProjectAuditLogger auditLogger;
	private final Clock clock;

	@Override
	public ExpenseRes create(Long projectId, ExpenseCreateReq request) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an"));
		projectStateValidator.validate(project);

		Long currentUserId = currentUserScopeProvider.currentUserId();
		if (currentUserId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}
		if (request.expenseDate().isAfter(LocalDate.now(clock))) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay phat sinh khong duoc o tuong lai");
		}

		LocalDateTime now = LocalDateTime.now(clock);
		ProjectExpense expense = new ProjectExpense();
		expense.setProjectId(projectId);
		expense.setUserId(currentUserId);
		expense.setType(request.type());
		expense.setAmount(request.amount());
		expense.setExpenseDate(request.expenseDate());
		expense.setDescription(request.description());
		expense.setReceiptUrl(request.receiptUrl());
		expense.setBillable(request.billable() != null ? request.billable() : false);
		expense.setCreatedBy(currentUsername());
		expense.setCreatedAt(now);
		expense.setUpdatedAt(now);

		ProjectExpense saved = expenseRepository.save(expense);
		auditLogger.recordExpenseCreated(projectId, saved.getId(), saved.getAmount());
		return expenseMapper.toResponse(saved);
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
