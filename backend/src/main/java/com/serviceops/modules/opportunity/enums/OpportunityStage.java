package com.serviceops.modules.opportunity.enums;

/**
 * Giai doan trong pipeline ban hang cua mot co hoi kinh doanh. Thu tu khai bao la thu tu hien thi
 * cot tren bang Kanban (PipelineBoardPage).
 */
public enum OpportunityStage {
	NEW,
	CONTACTED,
	PROPOSAL,
	NEGOTIATION,
	WON,
	LOST
}
