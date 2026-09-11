package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.request.TaskAssignmentReq;
import com.serviceops.modules.project.dto.request.TaskProgressReq;
import com.serviceops.modules.project.dto.response.TaskAssignmentRes;
import com.serviceops.modules.project.dto.response.TaskRes;

import java.util.List;

public interface TaskService {
	List<TaskAssignmentRes> assign(Long projectId, Long taskId, TaskAssignmentReq request);

	List<TaskAssignmentRes> findAssignments(Long projectId, Long taskId);

	TaskRes updateProgress(Long projectId, Long taskId, TaskProgressReq request);
}
