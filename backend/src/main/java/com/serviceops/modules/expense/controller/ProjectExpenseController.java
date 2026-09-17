package com.serviceops.modules.expense.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.expense.dto.request.ExpenseCreateReq;
import com.serviceops.modules.expense.dto.response.ExpenseRes;
import com.serviceops.modules.expense.service.ProjectExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

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
}
