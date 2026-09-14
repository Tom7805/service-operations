package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.request.TaskCreateReq;
import com.serviceops.modules.project.dto.request.WorkPackageReq;
import com.serviceops.modules.project.dto.response.TaskRes;
import com.serviceops.modules.project.dto.response.WorkBreakdownRes;
import java.util.List;

public interface WorkPackageService {
	WorkBreakdownRes createWorkPackage(Long projectId, WorkPackageReq request);
	TaskRes createTask(Long projectId, Long workPackageId, TaskCreateReq request);

	/**
	 * NCL-05-CN-007 / TC-02: xoa mot hang muc khong con can cua du an.
	 * Chi xoa hang muc la (khong co hang muc con va cong viec) va du an con dang chay.
	 */
	void deleteWorkPackage(Long projectId, Long workPackageId);

	List<WorkBreakdownRes> getWorkBreakdown(Long projectId);
}
