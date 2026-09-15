package com.serviceops.modules.timesheet.dto.response;

import com.serviceops.modules.project.enums.TaskStatus;

public record TimeEntryTaskRes(Long projectId, String projectName, Long taskId, String taskName,
		TaskStatus taskStatus) {
}