package com.serviceops.modules.opportunity.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.request.StageChangeReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.dto.response.PipelineStageRes;
import com.serviceops.modules.opportunity.service.OpportunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Co hoi kinh doanh va bang Kanban pipeline ban hang, theo giai doan (Opportunity.stage). */
@RestController
@RequestMapping("/opportunities")
@RequiredArgsConstructor
public class OpportunityController {

	private final OpportunityService opportunityService;

	/** Toan bo pipeline nhom theo giai doan — nguon du lieu cho bang Kanban. */
	@GetMapping("/pipeline")
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02') or hasRole('VT-07')")
	public BaseRes<List<PipelineStageRes>> pipeline() {
		return BaseRes.ok(opportunityService.getPipeline());
	}

	@PostMapping
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02')")
	public BaseRes<OpportunityRes> create(@Valid @RequestBody OpportunityCreateReq request) {
		return BaseRes.ok("Tạo cơ hội kinh doanh thành công", opportunityService.create(request));
	}

	/** Keo-tha the tren bang Kanban sang cot giai doan khac. */
	@PatchMapping("/{id}/stage")
	@PreAuthorize("hasRole('VT-04') or hasRole('VT-02')")
	public BaseRes<OpportunityRes> changeStage(@PathVariable Long id, @Valid @RequestBody StageChangeReq request) {
		return BaseRes.ok("Đã cập nhật giai đoạn", opportunityService.changeStage(id, request.stage()));
	}
}
