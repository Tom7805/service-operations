package com.serviceops.modules.identity.department.dto.response;

public record DepartmentRes(Long id, String name, Long parentId, Long managerId, String managerName, String unitType) {}
