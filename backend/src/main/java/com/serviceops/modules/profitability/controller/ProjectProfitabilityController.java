package com.serviceops.modules.profitability.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.dto.response.ProjectMarginRes;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.ProjectMarginService;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
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
	private final ProjectMarginService projectMarginService;
	private final RevenueRecognitionService revenueRecognitionService;

	@GetMapping("/labor-cost")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-02', 'VT-05')")
	public BaseRes<ProjectLaborCostRes> getLaborCost(@PathVariable Long projectId) {
		return BaseRes.ok(laborCostService.calculateProjectLaborCost(projectId));
	}

	/** NCL-09-CN-002: TC-04 gioi han chi Ke toan (VT-05) va Ban giam doc (VT-01) duoc xem. */
	@GetMapping("/revenue")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-05')")
	public BaseRes<RecognizedRevenueRes> getRecognizedRevenue(@PathVariable Long projectId) {
		return BaseRes.ok(revenueRecognitionService.calculateRecognizedRevenue(projectId));
	}

	/** NCL-09-CN-003: PM, Ke toan va Ban giam doc xem bien loi nhuan thoi gian thuc. */
	@GetMapping("/margin")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-02', 'VT-05')")
	public BaseRes<ProjectMarginRes> getProjectMargin(@PathVariable Long projectId) {
		return BaseRes.ok(projectMarginService.calculateProjectMargin(projectId));
	}
}
