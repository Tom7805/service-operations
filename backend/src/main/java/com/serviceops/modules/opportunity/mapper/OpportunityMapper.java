package com.serviceops.modules.opportunity.mapper;

import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import org.springframework.stereotype.Component;

/**
 * Anh xa entity {@link Opportunity} sang {@link OpportunityRes}.
 */
@Component
public class OpportunityMapper {

	/**
	 * @param customerName Ten khach hang (lay truoc tu bang customers) de hien thi; null neu khong co.
	 */
	public OpportunityRes toResponse(Opportunity opportunity, String customerName) {
		return new OpportunityRes(
				opportunity.getId(),
				opportunity.getName(),
				opportunity.getCustomerId(),
				customerName,
				opportunity.getExpectedValue(),
				opportunity.getExpectedCloseDate(),
				opportunity.getStage() == null ? null : opportunity.getStage().name(),
				opportunity.getStatus() == null ? null : opportunity.getStatus().name(),
				opportunity.getProbability(),
				opportunity.getOwnerId(),
				opportunity.getCreatedBy(),
				opportunity.getCreatedAt()
		);
	}
}