package com.serviceops.modules.identity.department.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.department.enums.DepartmentType;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Rang buoc cap bac cay to chuc: mot don vi khong duoc truc thuoc don vi co
 * cap thap hon minh (vi du: Ban khong the la con cua Phong).
 */
@Component
@RequiredArgsConstructor
public class DepartmentHierarchyValidator {
	private final DepartmentRepository departmentRepository;

	public void validate(DepartmentType childType, Long parentId) {
		if (parentId == null) {
			return;
		}
		Department parent = departmentRepository.findById(parentId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay bo phan cha"));
		if (childType.getRank() < parent.getType().getRank()) {
			throw new BusinessRuleException(ErrorCode.HIERARCHY_VIOLATION,
					"Khong the dat don vi cap \"" + childType.getLabel()
							+ "\" truc thuoc don vi cap thap hon \"" + parent.getType().getLabel() + "\"");
		}
	}
}
