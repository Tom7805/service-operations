package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.request.TaskBudgetReq;
import com.serviceops.modules.project.dto.response.TaskBudgetStatusRes;

public interface TaskBudgetService {
	TaskBudgetStatusRes setBudget(Long projectId, Long taskId, TaskBudgetReq request);
}
