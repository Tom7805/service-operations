package com.serviceops.modules.opportunity.dto.response;

import java.math.BigDecimal;
import java.util.List;

/** Mot cot tren bang Kanban pipeline: giai doan + danh sach co hoi + tong gia tri cot do. */
public record PipelineStageRes(
	String stage,
	String stageLabel,
	long count,
	BigDecimal totalAmount,
	List<OpportunityRes> opportunities
) {
}
