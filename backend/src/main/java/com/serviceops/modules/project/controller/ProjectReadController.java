package com.serviceops.modules.project.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Doc thong tin du an cho cac man hinh con cua Epic NCL-05 (cong viec, moc tien do, rui ro,
 * dong du an). Frontend can it nhat {@code status} de khoa/mo nut chinh sua.
 *
 * <p>Cho phep Quan ly du an (VT-02), Nhan vien chuyen mon (VT-03) va Ban giam doc (VT-01) —
 * cung tap vai tro doc {@code work-breakdown}.</p>
 */
@RestController
@RequestMapping("/projects/{projectId}")
@RequiredArgsConstructor
public class ProjectReadController {

	private final ProjectService projectService;

	@GetMapping
	@PreAuthorize("hasRole('VT-01') or hasRole('VT-02') or hasRole('VT-03')")
	public BaseRes<ProjectRes> getProject(@PathVariable Long projectId) {
		return BaseRes.ok(projectService.getProject(projectId));
	}
}
