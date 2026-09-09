package com.serviceops.modules.project.dto.request;

import com.serviceops.modules.project.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record TaskProgressReq(
		@NotNull(message = "Trang thai khong duoc de trong") TaskStatus status) {
}
