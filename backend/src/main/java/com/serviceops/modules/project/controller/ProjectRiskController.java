package com.serviceops.modules.project.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.project.dto.request.ProjectRiskReq;
import com.serviceops.modules.project.dto.request.ProjectRiskStatusReq;
import com.serviceops.modules.project.dto.response.ProjectRiskRes;
import com.serviceops.modules.project.service.ProjectRiskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-05-CN-009: quan ly rui ro cua du an.
 *
 * <p>Chi Quan ly du an (VT-02) duoc thao tac (TC-03). Vai tro khac bi tu choi 403
 * va bi ghi nhat ky lan tu choi boi {@code AccessDeniedAuditRecorder}.</p>
 */
@RestController
@RequestMapping("/projects/{projectId}/risks")
@RequiredArgsConstructor
public class ProjectRiskController {

	private final ProjectRiskService projectRiskService;

	/** TC-02: bang theo doi rui ro — he thong tu tinh diem/muc do va sap theo diem giam dan. */
	@GetMapping
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<ProjectRiskRes>> getRisks(@PathVariable Long projectId) {
		return BaseRes.ok(projectRiskService.getRisks(projectId));
	}

	/** TC-01: ghi nhan rui ro (mo ta, muc tac dong, kha nang xay ra, bien phap, nguoi theo doi). */
	@PostMapping
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ProjectRiskRes> createRisk(@PathVariable Long projectId,
			@Valid @RequestBody ProjectRiskReq request) {
		return BaseRes.ok("Ghi nhan rui ro thanh cong",
				projectRiskService.createRisk(projectId, request));
	}

	/** Cap nhat noi dung rui ro. */
	@PutMapping("/{riskId}")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ProjectRiskRes> updateRisk(@PathVariable Long projectId,
			@PathVariable Long riskId, @Valid @RequestBody ProjectRiskReq request) {
		return BaseRes.ok("Cap nhat rui ro thanh cong",
				projectRiskService.updateRisk(projectId, riskId, request));
	}

	/** Cap nhat trang thai xu ly rui ro (OPEN/MITIGATING/CLOSED). */
	@PutMapping("/{riskId}/status")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ProjectRiskRes> changeStatus(@PathVariable Long projectId,
			@PathVariable Long riskId, @Valid @RequestBody ProjectRiskStatusReq request) {
		return BaseRes.ok("Cap nhat trang thai rui ro thanh cong",
				projectRiskService.changeStatus(projectId, riskId, request));
	}

	/** Xoa rui ro. */
	@DeleteMapping("/{riskId}")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<Void> deleteRisk(@PathVariable Long projectId, @PathVariable Long riskId) {
		projectRiskService.deleteRisk(projectId, riskId);
		return BaseRes.ok("Xoa rui ro thanh cong", null);
	}
}
