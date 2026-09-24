package com.serviceops.modules.portal.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.portal.dto.response.PortalProjectProgressRes;
import com.serviceops.modules.portal.dto.response.PortalProjectRes;
import com.serviceops.modules.portal.security.PortalOnly;
import com.serviceops.modules.portal.service.PortalProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** NCL-13-CN-002 — khach hang (VT-09) xem tien do du an cua chinh minh tren cong. */
@RestController
@RequestMapping("/portal/projects")
@RequiredArgsConstructor
@PortalOnly
public class PortalProjectController {

	private final PortalProjectService portalProjectService;

	/** TC-01: chi du an cua chinh khach hang. */
	@GetMapping
	public BaseRes<List<PortalProjectRes>> list() {
		return BaseRes.ok(portalProjectService.listMyProjects());
	}

	/** TC-02/TC-03: du an khach hang khac -> 403; khong tra ghi chu noi bo. */
	@GetMapping("/{projectId}")
	public BaseRes<PortalProjectProgressRes> getProgress(@PathVariable Long projectId) {
		return BaseRes.ok(portalProjectService.getProgress(projectId));
	}
}
