package com.serviceops.modules.project.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.api.PageRes;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Toan bo du an trong he thong — phuc vu cac o chon du an dang dropdown o man hinh
 * Gia von/Bien loi nhuan (NCL-09: ProjectLaborCostPage, ProjectMarginPage, PlannedVsActualPage,
 * ProfitForecastPage, ProjectRecognizedRevenuePage). Truoc day frontend dung mot mang du lieu
 * mau co dinh (mockProjects trong App.tsx) nen khong bao gio hien du an that.
 */
@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectListController {

	private final ProjectService projectService;

	/** Mot trang du an (tim theo ma/ten) cho o chon du an co tim kiem o cac man Gia von/Bien loi nhuan. */
	@GetMapping("/paged")
	@PreAuthorize("hasRole('VT-01') or hasRole('VT-02') or hasRole('VT-03') or hasRole('VT-05')")
	public BaseRes<PageRes<ProjectRes, Void>> listPage(@RequestParam(required = false) String keyword,
			@RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
		return BaseRes.ok(projectService.listPage(keyword, page, size));
	}

	@GetMapping
	@PreAuthorize("hasRole('VT-01') or hasRole('VT-02') or hasRole('VT-03') or hasRole('VT-05')")
	public BaseRes<List<ProjectRes>> listAll() {
		return BaseRes.ok(projectService.listAll());
	}
}
