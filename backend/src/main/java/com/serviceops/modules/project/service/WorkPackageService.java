package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.request.TaskCreateReq;
import com.serviceops.modules.project.dto.request.WorkPackageReq;
import com.serviceops.modules.project.dto.response.TaskRes;
import com.serviceops.modules.project.dto.response.WorkBreakdownRes;
import java.util.List;

public interface WorkPackageService {
	WorkBreakdownRes createWorkPackage(Long projectId, WorkPackageReq request);
	TaskRes createTask(Long projectId, Long workPackageId, TaskCreateReq request);
	List<WorkBreakdownRes> getWorkBreakdown(Long projectId);
}
