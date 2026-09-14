package com.serviceops.modules.opportunity.mapper;

import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.service.impl.OpportunityStageDurationCalculator;
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
		return toResponse(opportunity, customerName, null);
	}

	/**
	 * @param customerName Ten khach hang (lay truoc tu bang customers) de hien thi; null neu khong co.
	 * @param daysInCurrentStage So ngay o giai doan hien tai (NCL-03-CN-007); null neu chua tinh
	 *        (vi du: response sau khi tao/dong co hoi, chi can tra ve du lieu vua ghi, khong can con
	 *        so nay ngay lap tuc).
	 */
	public OpportunityRes toResponse(Opportunity opportunity, String customerName, Long daysInCurrentStage) {
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
				opportunity.getCreatedAt(),
				opportunity.getLossReason() == null ? null : opportunity.getLossReason().name(),
				opportunity.getCloseReasonDetail(),
				opportunity.getCompetitorName(),
				opportunity.getClosedAt(),
				daysInCurrentStage,
				daysInCurrentStage == null ? null : OpportunityStageDurationCalculator.STALLED_THRESHOLD_DAYS
		);
	}
}