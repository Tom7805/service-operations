package com.serviceops.modules.expense.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.expense.dto.request.ExpenseCreateReq;
import com.serviceops.modules.expense.dto.request.ExpenseBillableReq;
import com.serviceops.modules.expense.dto.request.ExpenseRejectReq;
import com.serviceops.modules.expense.dto.response.ExpenseRes;
import com.serviceops.modules.expense.entity.ProjectExpense;
import com.serviceops.modules.expense.enums.ExpenseStatus;
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
import java.util.List;

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

	@Override
	public ExpenseRes updateRejected(Long expenseId, ExpenseCreateReq request) {
		Long currentUserId = currentUserScopeProvider.currentUserId();
		if (currentUserId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}
		ProjectExpense expense = findExpense(expenseId);
		if (!currentUserId.equals(expense.getUserId())) {
			throw new AccessDeniedException("Chi nguoi tao phieu moi duoc sua");
		}
		if (expense.getStatus() != ExpenseStatus.REJECTED) {
			throw invalidState("Chi phieu bi tu choi moi duoc sua");
		}
		Project project = projectRepository.findById(expense.getProjectId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay du an"));
		projectStateValidator.validate(project);
		if (request.expenseDate().isAfter(LocalDate.now(clock))) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ngay phat sinh khong duoc o tuong lai");
		}
		LocalDateTime now = LocalDateTime.now(clock);
		expense.setType(request.type());
		expense.setAmount(request.amount());
		expense.setExpenseDate(request.expenseDate());
		expense.setDescription(request.description());
		expense.setReceiptUrl(request.receiptUrl());
		expense.setBillable(request.billable() != null ? request.billable() : false);
		expense.setStatus(ExpenseStatus.SUBMITTED);
		expense.setRejectedBy(null);
		expense.setRejectedAt(null);
		expense.setRejectReason(null);
		expense.setUpdatedAt(now);
		ProjectExpense saved = expenseRepository.save(expense);
		auditLogger.recordExpenseResubmitted(saved.getProjectId(), saved.getId());
		return expenseMapper.toResponse(saved);
	}

	@Override
	@Transactional(readOnly = true)
	public List<ExpenseRes> findByProject(Long projectId) {
		requireAuthenticatedUser();
		if (!projectRepository.existsById(projectId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay du an");
		}
		return expenseRepository.findByProjectIdOrderByExpenseDateDescIdDesc(projectId).stream()
				.map(expenseMapper::toResponse).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<ExpenseRes> findPending() {
		requireAuthenticatedUser();
		return expenseRepository.findByStatusOrderByExpenseDateAscIdAsc(ExpenseStatus.SUBMITTED).stream()
				.map(expenseMapper::toResponse).toList();
	}

	@Override
	public ExpenseRes approve(Long expenseId) {
		requireAuthenticatedUser();
		ProjectExpense expense = findExpense(expenseId);
		if (expense.getStatus() != ExpenseStatus.SUBMITTED) {
			throw invalidState("Phieu chi phi khong o trang thai cho duyet (" + expense.getStatus() + ")");
		}
		LocalDateTime now = LocalDateTime.now(clock);
		expense.setStatus(ExpenseStatus.APPROVED);
		expense.setApprovedBy(currentUsername());
		expense.setApprovedAt(now);
		expense.setUpdatedAt(now);
		ProjectExpense saved = expenseRepository.save(expense);
		auditLogger.recordExpenseApproved(saved.getProjectId(), saved.getId(), saved.getAmount());
		return expenseMapper.toResponse(saved);
	}

	@Override
	public ExpenseRes reject(Long expenseId, ExpenseRejectReq request) {
		requireAuthenticatedUser();
		ProjectExpense expense = findExpense(expenseId);
		if (expense.getStatus() != ExpenseStatus.SUBMITTED) {
			throw invalidState("Phieu chi phi khong o trang thai cho duyet (" + expense.getStatus() + ")");
		}
		String reason = request.reason().trim();
		LocalDateTime now = LocalDateTime.now(clock);
		expense.setStatus(ExpenseStatus.REJECTED);
		expense.setRejectedBy(currentUsername());
		expense.setRejectedAt(now);
		expense.setRejectReason(reason);
		expense.setUpdatedAt(now);
		ProjectExpense saved = expenseRepository.save(expense);
		auditLogger.recordExpenseRejected(saved.getProjectId(), saved.getId(), reason);
		return expenseMapper.toResponse(saved);
	}

	@Override
	public ExpenseRes updateBillable(Long expenseId, ExpenseBillableReq request) {
		requireAuthenticatedUser();
		ProjectExpense expense = findExpense(expenseId);
		if (expense.getStatus() != ExpenseStatus.APPROVED) {
			throw invalidState("Chi phi phai duoc duyet truoc khi danh dau tinh lai cho khach hang");
		}
		if (!request.billable() && Boolean.TRUE.equals(expense.getInvoiced())) {
			throw invalidState("Chi phi da nam trong hoa don, khong the bo danh dau tinh lai cho khach hang");
		}
		LocalDateTime now = LocalDateTime.now(clock);
		expense.setBillable(request.billable());
		expense.setUpdatedAt(now);
		ProjectExpense saved = expenseRepository.save(expense);
		auditLogger.recordExpenseBillableUpdated(saved.getProjectId(), saved.getId(), saved.getBillable());
		return expenseMapper.toResponse(saved);
	}

	private ProjectExpense findExpense(Long expenseId) {
		return expenseRepository.findById(expenseId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay phieu chi phi"));
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
