package com.serviceops.modules.profitability.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.service.LaborCostService;
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

	@GetMapping("/labor-cost")
	@PreAuthorize("hasAnyRole('VT-01', 'VT-02', 'VT-05')")
	public BaseRes<ProjectLaborCostRes> getLaborCost(@PathVariable Long projectId) {
		return BaseRes.ok(laborCostService.calculateProjectLaborCost(projectId));
	}
}
