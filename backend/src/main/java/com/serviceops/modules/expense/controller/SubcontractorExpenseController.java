package com.serviceops.modules.expense.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.expense.dto.request.ExpenseRejectReq;
import com.serviceops.modules.expense.dto.request.SubcontractorExpenseReq;
import com.serviceops.modules.expense.dto.response.SubcontractorExpenseRes;
import com.serviceops.modules.expense.service.SubcontractorExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** NCL-08-CN-004: ghi nhan chi phi thue ngoai cho du an. */
@RestController
@RequiredArgsConstructor
public class SubcontractorExpenseController {

	private final SubcontractorExpenseService subcontractorExpenseService;

	@PostMapping("/projects/{projectId}/subcontractor-expenses")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<SubcontractorExpenseRes> create(@PathVariable Long projectId,
			@Valid @RequestBody SubcontractorExpenseReq request) {
		return BaseRes.ok("Ghi nhan chi phi thue ngoai thanh cong",
				subcontractorExpenseService.create(projectId, request));
	}

	@GetMapping("/projects/{projectId}/subcontractor-expenses")
	@PreAuthorize("hasRole('VT-02') or hasRole('VT-05')")
	public BaseRes<List<SubcontractorExpenseRes>> findByProject(@PathVariable Long projectId) {
		return BaseRes.ok(subcontractorExpenseService.findByProject(projectId));
	}

	@GetMapping("/subcontractor-expenses/pending")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<SubcontractorExpenseRes>> findPending() {
		return BaseRes.ok(subcontractorExpenseService.findPending());
	}

	@PostMapping("/subcontractor-expenses/{expenseId}/approve")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<SubcontractorExpenseRes> approve(@PathVariable Long expenseId) {
		return BaseRes.ok("Duyet chi phi thue ngoai thanh cong", subcontractorExpenseService.approve(expenseId));
	}

	@PostMapping("/subcontractor-expenses/{expenseId}/reject")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<SubcontractorExpenseRes> reject(@PathVariable Long expenseId,
			@Valid @RequestBody ExpenseRejectReq request) {
		return BaseRes.ok("Tu choi chi phi thue ngoai thanh cong",
				subcontractorExpenseService.reject(expenseId, request));
	}
}
