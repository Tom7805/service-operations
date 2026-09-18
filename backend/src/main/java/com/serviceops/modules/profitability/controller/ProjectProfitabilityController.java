package com.serviceops.modules.profitability.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.profitability.dto.response.PlannedVsActualMarginRes;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.MarginComparisonService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects/{projectId}/profitability")
@RequiredArgsConstructor
public class ProjectProfitabilityController {

	private final LaborCostService laborCostService;
	private final MarginComparisonService marginComparisonService;

	@GetMapping("/labor-cost")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-02', 'VT-05')")
	public BaseRes<ProjectLaborCostRes> getLaborCost(@PathVariable Long projectId) {
		return BaseRes.ok(laborCostService.calculateProjectLaborCost(projectId));
	}

	/**
	 * NCL-09-CN-006 — chỉ Quản lý dự án (VT-02) được xem, đúng vai trò của user story; TC-03 yêu cầu
	 * vai trò khác bị từ chối (403, tự ghi nhật ký qua {@code GlobalExceptionHandler} +
	 * {@code AccessDeniedAuditRecorder} — QTN-01/QTN-03).
	 */
	@GetMapping("/planned-vs-actual-margin")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<PlannedVsActualMarginRes> getPlannedVsActualMargin(@PathVariable Long projectId) {
		return BaseRes.ok(marginComparisonService.compare(projectId));
	}
}
