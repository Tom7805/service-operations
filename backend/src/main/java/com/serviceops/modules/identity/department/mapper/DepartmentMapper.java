package com.serviceops.modules.identity.department.mapper;

import com.serviceops.modules.identity.department.dto.response.DepartmentRes;
import com.serviceops.modules.identity.department.dto.response.DepartmentTreeRes;
import com.serviceops.modules.identity.department.entity.Department;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DepartmentMapper {
	public DepartmentRes toResponse(Department department) {
		return new DepartmentRes(department.getId(), department.getName(),
				department.getParent() == null ? null : department.getParent().getId(),
				department.getManager() == null ? null : department.getManager().getId(),
				department.getManager() == null ? null : department.getManager().getFullName());
	}

	public DepartmentTreeRes toTreeResponse(Department department, List<DepartmentTreeRes> children) {
		return new DepartmentTreeRes(department.getId(), department.getName(),
				department.getManager() == null ? null : department.getManager().getId(),
				department.getManager() == null ? null : department.getManager().getFullName(), children);
	}
}
