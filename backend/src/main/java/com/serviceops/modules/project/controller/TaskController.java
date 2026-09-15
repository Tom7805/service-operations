package com.serviceops.modules.project.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.project.dto.response.MyTaskRes;
import com.serviceops.modules.project.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-05-CN-004: man hinh "Viec cua toi" — noi nguoi dung tu xem cong viec dang duoc
 * giao (bat ke thuoc du an nao) va cap nhat tien do (PATCH /projects/{id}/tasks/{id}/progress
 * o WorkPackageController).
 */
@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {
	private final TaskService taskService;

	@GetMapping("/my-assignments")
	@PreAuthorize("hasRole('VT-01') or hasRole('VT-02') or hasRole('VT-03')")
	public BaseRes<List<MyTaskRes>> findMyTasks() {
		return BaseRes.ok(taskService.findMyTasks());
	}
}
