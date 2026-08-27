package com.serviceops.modules.identity.department.dto.response;

import java.util.List;

public record DepartmentTreeRes(Long id, String name, Long managerId, String managerName, String unitType,
								List<DepartmentTreeRes> children) {}
