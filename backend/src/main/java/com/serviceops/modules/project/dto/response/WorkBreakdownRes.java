package com.serviceops.modules.project.dto.response;

import java.util.List;

public record WorkBreakdownRes(Long id, Long parentId, String name, String description,
		List<TaskRes> tasks, List<WorkBreakdownRes> children) {}
