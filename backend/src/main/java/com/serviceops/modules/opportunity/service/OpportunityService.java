package com.serviceops.modules.opportunity.service;

import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.dto.response.PipelineStageRes;
import com.serviceops.modules.opportunity.enums.OpportunityStage;

import java.util.List;

public interface OpportunityService {

	/** Toàn bộ pipeline, nhóm theo giai đoạn — dùng cho bảng Kanban. */
	List<PipelineStageRes> getPipeline();

	OpportunityRes create(OpportunityCreateReq request);

	/** Chuyển một cơ hội sang giai đoạn khác — hành động kéo-thả trên bảng Kanban. */
	OpportunityRes changeStage(Long opportunityId, OpportunityStage newStage);
}
