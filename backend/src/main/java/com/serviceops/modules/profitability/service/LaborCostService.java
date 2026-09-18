package com.serviceops.modules.profitability.service;

import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;

public interface LaborCostService {

	/** Tinh gia von gio cong tu cac dong APPROVED cua du an. */
	ProjectLaborCostRes calculateProjectLaborCost(Long projectId);
}