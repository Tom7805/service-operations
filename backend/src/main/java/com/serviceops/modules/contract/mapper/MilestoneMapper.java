package com.serviceops.modules.contract.mapper;

import com.serviceops.modules.contract.dto.response.MilestoneRes;
import com.serviceops.modules.contract.entity.ContractMilestone;
import org.springframework.stereotype.Component;

/**
 * Anh xa entity {@link ContractMilestone} sang {@link MilestoneRes}.
 */
@Component
public class MilestoneMapper {

	public MilestoneRes toResponse(ContractMilestone milestone) {
		return new MilestoneRes(
				milestone.getId(),
				milestone.getContractId(),
				milestone.getName(),
				milestone.getPercentage(),
				milestone.getAmount(),
				milestone.getExpectedDate(),
				milestone.getAcceptanceCondition(),
				milestone.getStatus() == null ? null : milestone.getStatus().name(),
				milestone.getSortOrder(),
				milestone.getCreatedAt()
		);
	}
}
