package com.serviceops.modules.acceptance.dto.response;

import com.serviceops.modules.acceptance.enums.AcceptanceStatus;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * NCL-12-CN-003: moc thanh toan cua hop dong kem phieu nghiem thu da gan (neu co) — Ke toan nhin
 * vao day de biet moc nao da du dieu kien lap hoa don va vi sao (QTN-25).
 */
public record MilestoneAcceptanceRes(
		Long milestoneId,
		Long contractId,
		String milestoneName,
		BigDecimal amount,
		LocalDate expectedDate,
		String acceptanceCondition,
		ContractMilestoneStatus milestoneStatus,
		Long certificateId,
		String certificateCode,
		AcceptanceStatus certificateStatus,
		String projectCode,
		String workPackageName) {
}
