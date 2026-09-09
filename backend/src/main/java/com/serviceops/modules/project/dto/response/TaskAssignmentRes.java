package com.serviceops.modules.project.dto.response;

import java.time.LocalDate;

public record TaskAssignmentRes(Long id, Long taskId, Long userId, String username, String fullName,
		LocalDate expectedStartDate, LocalDate expectedEndDate) {
}