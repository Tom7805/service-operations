package com.serviceops.modules.opportunity.dto.request;

import com.serviceops.modules.opportunity.enums.OpportunityStage;
import jakarta.validation.constraints.NotNull;

/**
 * Request chuyen giai doan co hoi (NCL-03-CN-002).
 *
 * @param opportunityId Id co hoi can chuyen giai doan (lay tu path variable, khong can truyen trong body).
 * @param targetStage Giai doan muon chuyen toi (kiem soat thu tu theo QTN-06).
 */
public record StageChangeReq(
		Long opportunityId,
		@NotNull(message = "Phai chon giai doan muon chuyen toi")
		OpportunityStage targetStage
) {}
