package com.serviceops.modules.opportunity.dto.request;

import jakarta.validation.constraints.NotNull;

import com.serviceops.modules.opportunity.enums.OpportunityStage;

public record StageChangeReq(
	@NotNull(message = "Vui lòng chọn giai đoạn mới") OpportunityStage stage
) {
}
