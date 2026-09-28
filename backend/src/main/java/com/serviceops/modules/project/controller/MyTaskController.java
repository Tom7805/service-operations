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
 * "Cong viec cua toi": danh sach cong viec dang duoc giao cho nguoi dang dang nhap,
 * gom tren tat ca du an. Khong gioi han vai tro — ai dang nhap cung xem duoc viec
 * cua chinh minh (NCL-05-CN-003/004).
 */
@RestController
@RequestMapping("/me/tasks")
@RequiredArgsConstructor
public class MyTaskController {
	private final TaskService taskService;

	@GetMapping
	@PreAuthorize("isAuthenticated()")
	public BaseRes<List<MyTaskRes>> findMyTasks() {
		return BaseRes.ok(taskService.findMyTasks());
	}
}
