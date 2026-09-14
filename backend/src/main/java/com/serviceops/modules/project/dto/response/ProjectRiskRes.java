package com.serviceops.modules.project.dto.response;

import com.serviceops.modules.project.enums.RiskLevel;
import com.serviceops.modules.project.enums.RiskStatus;

import java.time.LocalDateTime;

/**
 * NCL-05-CN-009: rui ro tren bang theo doi — {@code score} (1..9) va {@code severity}
 * do he thong tinh dong tu impact x likelihood tai thoi diem doc.
 */
public record ProjectRiskRes(
		Long id,
		Long projectId,
		String description,
		RiskLevel impact,
		RiskLevel likelihood,
		int score,
		RiskLevel severity,
		RiskStatus status,
		String mitigation,
		Long watcherId,
		String watcherName,
		String createdBy,
		LocalDateTime createdAt,
		LocalDateTime updatedAt) {
}
