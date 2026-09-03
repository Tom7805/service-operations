package com.serviceops.modules.opportunity.dto.request;

import com.serviceops.modules.opportunity.enums.OpportunityStage;

/**
 * Request chuyen giai doan co hoi (NCL-03-CN-002).
 *
 * @param opportunityId Id co hoi can chuyen giai doan.
 * @param targetStage Giai doan muon chuyen toi (kiem soat thu tu theo QTN-06).
 */
public record StageChangeReq(
		Long opportunityId,
		OpportunityStage targetStage
) {}
