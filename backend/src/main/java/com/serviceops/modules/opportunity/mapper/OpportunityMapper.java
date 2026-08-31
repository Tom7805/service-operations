package com.serviceops.modules.opportunity.mapper;

import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import org.springframework.stereotype.Component;

@Component
public class OpportunityMapper {

	public OpportunityRes toResponse(Opportunity opportunity, String customerName, String ownerFullName) {
		return new OpportunityRes(
			opportunity.getId(),
			opportunity.getName(),
			opportunity.getCustomerId(),
			customerName,
			opportunity.getOwnerUserId(),
			ownerFullName,
			opportunity.getStage() == null ? null : opportunity.getStage().name(),
			opportunity.getAmount(),
			opportunity.getExpectedCloseDate(),
			opportunity.getNote(),
			opportunity.getCreatedAt()
		);
	}
}
