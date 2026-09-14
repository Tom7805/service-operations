package com.serviceops.modules.project.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.project.dto.request.ProjectCreateFromContractReq;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.service.ProjectService;
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

@RestController
@RequestMapping("/contracts/{contractId}/projects")
@RequiredArgsConstructor
public class ProjectController {
	private final ProjectService projectService;

	@PostMapping
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<ProjectRes> createFromContract(@PathVariable Long contractId,
			@Valid @RequestBody ProjectCreateFromContractReq request) {
		return BaseRes.ok("Tao du an tu hop dong thanh cong",
				projectService.createFromContract(contractId, request));
	}

	/** Danh sach du an cua hop dong — dieu huong tu man hinh hop dong sang du an. */
	@GetMapping
	@PreAuthorize("hasRole('VT-01') or hasRole('VT-02') or hasRole('VT-03')")
	public BaseRes<List<ProjectRes>> listByContract(@PathVariable Long contractId) {
		return BaseRes.ok(projectService.listByContract(contractId));
	}
}
