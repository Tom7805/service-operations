package com.serviceops.modules.project.dto.request;

import com.serviceops.modules.project.enums.RiskStatus;
import jakarta.validation.constraints.NotNull;

/** NCL-05-CN-009: cap nhat trang thai xu ly cua rui ro (OPEN/MITIGATING/CLOSED). */
public record ProjectRiskStatusReq(
		@NotNull(message = "Trang thai khong duoc de trong") RiskStatus status) {
}
