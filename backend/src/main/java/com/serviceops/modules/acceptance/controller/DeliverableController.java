package com.serviceops.modules.acceptance.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.acceptance.dto.request.DeliverableCreateReq;
import com.serviceops.modules.acceptance.dto.request.DeliverableVersionReq;
import com.serviceops.modules.acceptance.dto.response.DeliverableRes;
import com.serviceops.modules.acceptance.dto.response.DeliverableVersionRes;
import com.serviceops.modules.acceptance.service.DeliverableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-12-CN-004: quan ly san pham ban giao va phien ban. Chi Quan ly du an (VT-02) cua du an; vai tro
 * khac nhan 403 va duoc ghi nhat ky "Tu choi truy cap" (TC-03).
 */
@RestController
@RequiredArgsConstructor
public class DeliverableController {

	private final DeliverableService deliverableService;

	@PostMapping("/projects/{projectId}/deliverables")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<DeliverableRes> create(@PathVariable Long projectId,
			@Valid @RequestBody DeliverableCreateReq request) {
		return BaseRes.ok("Khai bao san pham ban giao thanh cong", deliverableService.create(projectId, request));
	}

	@GetMapping("/projects/{projectId}/deliverables")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<DeliverableRes>> list(@PathVariable Long projectId,
			@RequestParam(required = false) Long workPackageId) {
		return BaseRes.ok(deliverableService.list(projectId, workPackageId));
	}

	@GetMapping("/deliverables/{deliverableId}")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<DeliverableRes> get(@PathVariable Long deliverableId) {
		return BaseRes.ok(deliverableService.get(deliverableId));
	}

	/** TC-01: them phien ban moi, phien ban cu giu nguyen; TC-02: trung so phien ban -> 409. */
	@PostMapping("/deliverables/{deliverableId}/versions")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<DeliverableVersionRes> addVersion(@PathVariable Long deliverableId,
			@Valid @RequestBody DeliverableVersionReq request) {
		return BaseRes.ok("Ghi nhan phien ban ban giao thanh cong",
				deliverableService.addVersion(deliverableId, request));
	}

	@GetMapping("/deliverables/{deliverableId}/versions")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<DeliverableVersionRes>> listVersions(@PathVariable Long deliverableId) {
		return BaseRes.ok(deliverableService.listVersions(deliverableId));
	}
}
