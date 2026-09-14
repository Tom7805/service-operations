package com.serviceops.modules.opportunity.mapper;

import com.serviceops.modules.opportunity.dto.response.ActivityRes;
import com.serviceops.modules.opportunity.entity.OpportunityActivity;
import org.springframework.stereotype.Component;

@Component
public class OpportunityActivityMapper {

	public ActivityRes toResponse(OpportunityActivity activity) {
		return new ActivityRes(activity.getId(), activity.getOpportunityId(), activity.getActivityType(),
				activity.getOccurredAt(), activity.getParticipants(), activity.getContent(),
				activity.getCreatedBy(), activity.getCreatedAt());
	}
}
