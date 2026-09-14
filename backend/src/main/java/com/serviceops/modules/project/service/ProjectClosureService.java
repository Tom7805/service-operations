package com.serviceops.modules.project.service;

import com.serviceops.modules.project.dto.response.ProjectRes;

public interface ProjectClosureService {
	ProjectRes closeProject(Long projectId);
}
