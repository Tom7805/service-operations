package com.serviceops.modules.project.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.project.dto.request.TaskAssignmentReq;
import com.serviceops.modules.project.dto.request.TaskBudgetReq;
import com.serviceops.modules.project.dto.request.TaskCreateReq;
import com.serviceops.modules.project.dto.request.TaskProgressReq;
import com.serviceops.modules.project.dto.request.WorkPackageReq;
import com.serviceops.modules.project.dto.response.TaskRes;
import com.serviceops.modules.project.dto.response.TaskAssignmentRes;
import com.serviceops.modules.project.dto.response.TaskBudgetStatusRes;
import com.serviceops.modules.project.dto.response.WorkBreakdownRes;
import com.serviceops.modules.project.service.WorkPackageService;
import com.serviceops.modules.project.service.TaskBudgetService;
import com.serviceops.modules.project.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/projects/{projectId}")
@RequiredArgsConstructor
public class WorkPackageController {
	private final WorkPackageService workPackageService;
	private final TaskService taskService;
	private final TaskBudgetService taskBudgetService;

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

	@PutMapping("/tasks/{taskId}/assignments")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<TaskAssignmentRes>> assignTask(@PathVariable Long projectId, @PathVariable Long taskId,
			@Valid @RequestBody TaskAssignmentReq request) {
		return BaseRes.ok("Giao viec cho nhan su thanh cong", taskService.assign(projectId, taskId, request));
	}

	@GetMapping("/tasks/{taskId}/assignments")
	@PreAuthorize("hasRole('VT-02') or hasRole('VT-03') or hasRole('VT-01')")
	public BaseRes<List<TaskAssignmentRes>> findTaskAssignments(@PathVariable Long projectId,
			@PathVariable Long taskId) {
		return BaseRes.ok(taskService.findAssignments(projectId, taskId));
	}

	@PatchMapping("/tasks/{taskId}/progress")
	@PreAuthorize("hasRole('VT-03')")
	public BaseRes<TaskRes> updateTaskProgress(@PathVariable Long projectId, @PathVariable Long taskId,
			@Valid @RequestBody TaskProgressReq request) {
		return BaseRes.ok("Cap nhat tien do cong viec thanh cong",
				taskService.updateProgress(projectId, taskId, request));
	}

	@PutMapping("/tasks/{taskId}/budget")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<TaskBudgetStatusRes> setTaskBudget(@PathVariable Long projectId, @PathVariable Long taskId,
			@Valid @RequestBody TaskBudgetReq request) {
		return BaseRes.ok("Dat ngan sach gio cong thanh cong",
				taskBudgetService.setBudget(projectId, taskId, request));
	}
}
