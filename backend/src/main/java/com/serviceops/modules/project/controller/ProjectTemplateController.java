package com.serviceops.modules.project.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.project.dto.request.ProjectCreateFromTemplateReq;
import com.serviceops.modules.project.dto.request.ProjectTemplateReq;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.dto.response.ProjectTemplateRes;
import com.serviceops.modules.project.service.ProjectTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-05-CN-007: Tao du an tu mau co san cay cong viec.
 *
 * <p>Chi Quan ly du an (VT-02) duoc su dung chuc nang (TC-03). Vai tro khac bi tu choi 403
 * va bi ghi nhat ky lan tu choi boi {@code AccessDeniedAuditRecorder}.</p>
 */
@RestController
@RequestMapping("/contracts/{contractId}/projects/from-template")
@RequiredArgsConstructor
public class ProjectTemplateController {

	private final ProjectTemplateService projectTemplateService;

	/** Danh sach mau du an dang hoat dong de chon khi tao du an. */
	@GetMapping
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<ProjectTemplateRes>> listTemplates(@PathVariable Long contractId) {
		return BaseRes.ok(projectTemplateService.findActiveTemplates());
	}

	/** TC-01: tao du an moi tu mau, he thong dung san cay cong viec va ngan sach gio theo mau. */
	@PostMapping
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ProjectRes> createFromTemplate(@PathVariable Long contractId,
			@Valid @RequestBody ProjectCreateFromTemplateReq request) {
		return BaseRes.ok("Tao du an tu mau thanh cong",
				projectTemplateService.createProjectFromTemplate(contractId, request));
	}
}
