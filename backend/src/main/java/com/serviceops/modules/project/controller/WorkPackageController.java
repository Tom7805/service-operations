package com.serviceops.modules.project.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.project.dto.request.TaskCreateReq;
import com.serviceops.modules.project.dto.request.WorkPackageReq;
import com.serviceops.modules.project.dto.response.TaskRes;
import com.serviceops.modules.project.dto.response.WorkBreakdownRes;
import com.serviceops.modules.project.service.WorkPackageService;
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
@RequestMapping("/projects/{projectId}")
@RequiredArgsConstructor
public class WorkPackageController {
	private final WorkPackageService workPackageService;

	@GetMapping("/work-breakdown")
	@PreAuthorize("hasRole('VT-02') or hasRole('VT-03') or hasRole('VT-01')")
	public BaseRes<List<WorkBreakdownRes>> getWorkBreakdown(@PathVariable Long projectId) {
		return BaseRes.ok(workPackageService.getWorkBreakdown(projectId));
	}

	@PostMapping("/work-packages")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<WorkBreakdownRes> createWorkPackage(@PathVariable Long projectId,
			@Valid @RequestBody WorkPackageReq request) {
		return BaseRes.ok("Tao hang muc thanh cong", workPackageService.createWorkPackage(projectId, request));
	}

	@PostMapping("/work-packages/{workPackageId}/tasks")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<TaskRes> createTask(@PathVariable Long projectId, @PathVariable Long workPackageId,
			@Valid @RequestBody TaskCreateReq request) {
		return BaseRes.ok("Tao cong viec thanh cong",
				workPackageService.createTask(projectId, workPackageId, request));
	}
}
