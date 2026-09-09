package com.serviceops.modules.project.dto.response;

import com.serviceops.modules.project.enums.TaskStatus;
import java.time.LocalDate;

public record TaskRes(Long id, Long projectId, Long workPackageId, Long parentTaskId,
		String name, String description, LocalDate expectedStartDate, LocalDate expectedEndDate,
		TaskStatus status) {}
