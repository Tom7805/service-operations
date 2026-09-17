package com.serviceops.modules.expense.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.expense.dto.request.ExpenseBillableReq;
import com.serviceops.modules.expense.dto.request.ExpenseCreateReq;
import com.serviceops.modules.expense.dto.request.ExpenseRejectReq;
import com.serviceops.modules.expense.dto.response.ExpenseRes;
import com.serviceops.modules.expense.service.ProjectExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ProjectExpenseController {

	private final ProjectExpenseService projectExpenseService;

	@PostMapping("/projects/{projectId}/expenses")
	@PreAuthorize("hasRole('VT-03')")
	public BaseRes<ExpenseRes> create(@PathVariable Long projectId,
			@Valid @RequestBody ExpenseCreateReq request) {
		return BaseRes.ok("Ghi nhan chi phi thanh cong", projectExpenseService.create(projectId, request));
	}

	@PutMapping("/expenses/{expenseId}")
	@PreAuthorize("hasRole('VT-03')")
	public BaseRes<ExpenseRes> updateRejected(@PathVariable Long expenseId,
			@Valid @RequestBody ExpenseCreateReq request) {
		return BaseRes.ok("Cap nhat va nop lai chi phi thanh cong",
				projectExpenseService.updateRejected(expenseId, request));
	}

	@GetMapping("/projects/{projectId}/expenses")
	@PreAuthorize("hasRole('VT-02') or hasRole('VT-03') or hasRole('VT-05')")
	public BaseRes<List<ExpenseRes>> findByProject(@PathVariable Long projectId) {
		return BaseRes.ok(projectExpenseService.findByProject(projectId));
	}

	@GetMapping("/expenses/pending")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<ExpenseRes>> findPending() {
		return BaseRes.ok(projectExpenseService.findPending());
	}

	@PostMapping("/expenses/{expenseId}/approve")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<ExpenseRes> approve(@PathVariable Long expenseId) {
		return BaseRes.ok("Duyet chi phi thanh cong", projectExpenseService.approve(expenseId));
	}

	@PostMapping("/expenses/{expenseId}/reject")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<ExpenseRes> reject(@PathVariable Long expenseId,
			@Valid @RequestBody ExpenseRejectReq request) {
		return BaseRes.ok("Tu choi chi phi thanh cong", projectExpenseService.reject(expenseId, request));
	}

	@PutMapping("/expenses/{expenseId}/billable")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ExpenseRes> updateBillable(@PathVariable Long expenseId,
			@Valid @RequestBody ExpenseBillableReq request) {
		return BaseRes.ok("Cap nhat chi phi tinh lai cho khach hang thanh cong",
				projectExpenseService.updateBillable(expenseId, request));
	}
}
