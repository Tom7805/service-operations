package com.serviceops.modules.expense.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.expense.dto.request.ExpenseRejectReq;
import com.serviceops.modules.expense.dto.request.SubcontractorExpenseReq;
import com.serviceops.modules.expense.dto.response.SubcontractorExpenseRes;
import com.serviceops.modules.expense.entity.SubcontractorExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.mapper.ExpenseMapper;
import com.serviceops.modules.expense.repository.SubcontractorExpenseRepository;
import com.serviceops.modules.expense.service.SubcontractorExpenseService;
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
import java.time.LocalDateTime;
import java.util.List;

/** NCL-08-CN-004: ghi nhan chi phi thue ngoai cho du an. */
@Service
@RequiredArgsConstructor
@Transactional
public class SubcontractorExpenseServiceImpl implements SubcontractorExpenseService {

	private final ProjectRepository projectRepository;
	private final SubcontractorExpenseRepository expenseRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final ExpenseProjectStateValidator projectStateValidator;
	private final ExpenseMapper expenseMapper;
	private final ProjectAuditLogger auditLogger;
	private final Clock clock;

	@Override
	public SubcontractorExpenseRes create(Long projectId, SubcontractorExpenseReq request) {
		Project project = projectRepository.findById(projectId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an"));
		projectStateValidator.validate(project);

		Long currentUserId = currentUserScopeProvider.currentUserId();
		if (currentUserId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}

		LocalDateTime now = LocalDateTime.now(clock);
		SubcontractorExpense expense = new SubcontractorExpense();
		expense.setProjectId(projectId);
		expense.setUserId(currentUserId);
		expense.setContractorName(request.contractorName().trim());
		expense.setWorkScope(request.workScope().trim());
		expense.setAmount(request.amount());
		expense.setIncurredPeriod(request.incurredPeriod());
		expense.setStatus(ExpenseStatus.SUBMITTED);
		expense.setCreatedBy(currentUsername());
		expense.setCreatedAt(now);
		expense.setUpdatedAt(now);

		SubcontractorExpense saved = expenseRepository.save(expense);
		auditLogger.recordSubcontractorExpenseCreated(projectId, saved.getId(), saved.getContractorName(),
				saved.getAmount());
		return expenseMapper.toResponse(saved);
	}

	@Override
	@Transactional(readOnly = true)
	public List<SubcontractorExpenseRes> findByProject(Long projectId) {
		requireAuthenticatedUser();
		if (!projectRepository.existsById(projectId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay du an");
		}
		return expenseRepository.findByProjectIdOrderByIncurredPeriodDescIdDesc(projectId).stream()
				.map(expenseMapper::toResponse).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<SubcontractorExpenseRes> findPending() {
		requireAuthenticatedUser();
		return expenseRepository.findByStatusOrderByIncurredPeriodAscIdAsc(ExpenseStatus.SUBMITTED).stream()
				.map(expenseMapper::toResponse).toList();
	}

	@Override
	public SubcontractorExpenseRes approve(Long expenseId) {
		requireAuthenticatedUser();
		SubcontractorExpense expense = findExpense(expenseId);
		if (expense.getStatus() != ExpenseStatus.SUBMITTED) {
			throw invalidState("Phieu chi phi thue ngoai khong o trang thai cho duyet (" + expense.getStatus() + ")");
		}
		LocalDateTime now = LocalDateTime.now(clock);
		expense.setStatus(ExpenseStatus.APPROVED);
		expense.setApprovedBy(currentUsername());
		expense.setApprovedAt(now);
		expense.setUpdatedAt(now);
		SubcontractorExpense saved = expenseRepository.save(expense);
		auditLogger.recordSubcontractorExpenseApproved(saved.getProjectId(), saved.getId(), saved.getAmount());
		return expenseMapper.toResponse(saved);
	}

	@Override
	public SubcontractorExpenseRes reject(Long expenseId, ExpenseRejectReq request) {
		requireAuthenticatedUser();
		SubcontractorExpense expense = findExpense(expenseId);
		if (expense.getStatus() != ExpenseStatus.SUBMITTED) {
			throw invalidState("Phieu chi phi thue ngoai khong o trang thai cho duyet (" + expense.getStatus() + ")");
		}
		String reason = request.reason().trim();
		LocalDateTime now = LocalDateTime.now(clock);
		expense.setStatus(ExpenseStatus.REJECTED);
		expense.setRejectedBy(currentUsername());
		expense.setRejectedAt(now);
		expense.setRejectReason(reason);
		expense.setUpdatedAt(now);
		SubcontractorExpense saved = expenseRepository.save(expense);
		auditLogger.recordSubcontractorExpenseRejected(saved.getProjectId(), saved.getId(), reason);
		return expenseMapper.toResponse(saved);
	}

	private SubcontractorExpense findExpense(Long expenseId) {
		return expenseRepository.findById(expenseId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay phieu chi phi thue ngoai"));
	}

	private void requireAuthenticatedUser() {
		if (currentUserScopeProvider.currentUserId() == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}
	}

	private BusinessRuleException invalidState(String message) {
		return new BusinessRuleException(ErrorCode.INVALID_STATE, message);
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
