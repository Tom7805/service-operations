package com.serviceops.modules.project.dto.request;

import com.serviceops.modules.project.enums.RiskLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * NCL-05-CN-009: yeu cau tao/cap nhat rui ro — mo ta, muc tac dong, kha nang xay ra,
 * bien phap giam thieu va nguoi theo doi.
 */
public record ProjectRiskReq(
		@NotBlank(message = "Mo ta rui ro khong duoc de trong") String description,
		@NotNull(message = "Muc tac dong khong duoc de trong") RiskLevel impact,
		@NotNull(message = "Kha nang xay ra khong duoc de trong") RiskLevel likelihood,
		String mitigation,
		@NotNull(message = "Nguoi theo doi khong duoc de trong") Long watcherId) {
}
