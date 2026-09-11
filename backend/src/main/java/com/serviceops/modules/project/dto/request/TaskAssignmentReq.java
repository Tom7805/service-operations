package com.serviceops.modules.project.dto.request;

import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDate;
import java.util.List;

public record TaskAssignmentReq(
		@NotEmpty(message = "Danh sach nguoi duoc giao khong duoc de trong") List<Long> userIds,
		LocalDate expectedStartDate,
		LocalDate expectedEndDate) {
}