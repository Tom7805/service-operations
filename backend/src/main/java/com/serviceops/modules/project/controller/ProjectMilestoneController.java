package com.serviceops.modules.project.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.project.dto.request.ProjectMilestoneCompleteReq;
import com.serviceops.modules.project.dto.request.ProjectMilestoneReq;
import com.serviceops.modules.project.dto.response.ProjectMilestoneRes;
import com.serviceops.modules.project.service.ProjectMilestoneService;
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
 * NCL-05-CN-008: quan ly moc tien do cua du an.
 *
 * <p>Chi Quan ly du an (VT-02) duoc thao tac (TC-03). Vai tro khac bi tu choi 403
 * va bi ghi nhat ky lan tu choi boi {@code AccessDeniedAuditRecorder}.</p>
 */
@RestController
@RequestMapping("/projects/{projectId}/milestones")
@RequiredArgsConstructor
public class ProjectMilestoneController {

	private final ProjectMilestoneService projectMilestoneService;

	/** TC-02: bang theo doi tien do — he thong tu danh dau dung han/cham khi tra danh sach. */
	@GetMapping
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<ProjectMilestoneRes>> getMilestones(@PathVariable Long projectId) {
		return BaseRes.ok(projectMilestoneService.getMilestones(projectId));
	}

	/** TC-01: tao moc tien do (ten, ngay ke hoach, hang muc phai hoan thanh). */
	@PostMapping
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ProjectMilestoneRes> createMilestone(@PathVariable Long projectId,
			@Valid @RequestBody ProjectMilestoneReq request) {
		return BaseRes.ok("Tao moc tien do thanh cong",
				projectMilestoneService.createMilestone(projectId, request));
	}

	/** Cap nhat ten, mo ta, ngay ke hoach va danh sach hang muc cua moc. */
	@PutMapping("/{milestoneId}")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ProjectMilestoneRes> updateMilestone(@PathVariable Long projectId,
			@PathVariable Long milestoneId, @Valid @RequestBody ProjectMilestoneReq request) {
		return BaseRes.ok("Cap nhat moc tien do thanh cong",
				projectMilestoneService.updateMilestone(projectId, milestoneId, request));
	}

	/** Ghi nhan ngay thuc te hoan thanh cua moc. */
	@PostMapping("/{milestoneId}/complete")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ProjectMilestoneRes> completeMilestone(@PathVariable Long projectId,
			@PathVariable Long milestoneId, @Valid @RequestBody ProjectMilestoneCompleteReq request) {
		return BaseRes.ok("Ghi nhan ngay thuc te thanh cong",
				projectMilestoneService.completeMilestone(projectId, milestoneId, request));
	}

	/** Xoa moc tien do. */
	@DeleteMapping("/{milestoneId}")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<Void> deleteMilestone(@PathVariable Long projectId, @PathVariable Long milestoneId) {
		projectMilestoneService.deleteMilestone(projectId, milestoneId);
		return BaseRes.ok("Xoa moc tien do thanh cong", null);
	}
}
