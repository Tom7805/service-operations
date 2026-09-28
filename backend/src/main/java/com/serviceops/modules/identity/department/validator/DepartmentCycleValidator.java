package com.serviceops.modules.identity.department.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DepartmentCycleValidator {
	private final DepartmentRepository departmentRepository;

	public void validate(Long departmentId, Long parentId) {
		Long currentId = parentId;
		while (currentId != null) {
			if (currentId.equals(departmentId)) {
				throw new BusinessRuleException(ErrorCode.INVALID_STATE, "Không thể di chuyển: bộ phận cha không được nằm bên trong chính bộ phận con của nó (tạo vòng lặp trong cây tổ chức)");
			}
			Department current = departmentRepository.findById(currentId)
					.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay bo phan cha"));
			currentId = current.getParent() == null ? null : current.getParent().getId();
		}
	}
}
