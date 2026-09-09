package com.serviceops.modules.project.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record TaskCreateReq(Long parentTaskId,
		@NotBlank(message = "Ten cong viec khong duoc de trong") String name,
		String description, LocalDate expectedStartDate, LocalDate expectedEndDate) {}
