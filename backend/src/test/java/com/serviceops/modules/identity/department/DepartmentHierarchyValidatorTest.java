package com.serviceops.modules.identity.department;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.department.enums.DepartmentType;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import com.serviceops.modules.identity.department.validator.DepartmentHierarchyValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Rang buoc cap bac cay to chuc: mot don vi khong duoc truc thuoc don vi co
 * cap thap hon minh (vi du: Ban khong the la con cua Phong).
 */
@ExtendWith(MockitoExtension.class)
class DepartmentHierarchyValidatorTest {

	@Mock
	private DepartmentRepository departmentRepository;

	private DepartmentHierarchyValidator validator;

	private Department departmentOfType(Long id, DepartmentType type) {
		Department department = new Department();
		department.setId(id);
		department.setType(type);
		return department;
	}

	@Test
	@DisplayName("Khong cho Ban truc thuoc Phong (cap cao hon khong duoc lam con cua cap thap hon)")
	void blocksHigherRankUnitUnderLowerRankParent() {
		validator = new DepartmentHierarchyValidator(departmentRepository);
		Department phong = departmentOfType(2L, DepartmentType.PHONG);
		when(departmentRepository.findById(2L)).thenReturn(Optional.of(phong));

		assertThatThrownBy(() -> validator.validate(DepartmentType.BAN, 2L))
				.isInstanceOf(BusinessRuleException.class)
				.extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
				.isEqualTo(ErrorCode.HIERARCHY_VIOLATION);
	}

	@Test
	@DisplayName("Cho phep Phong truc thuoc Ban (cap thap hon lam con cua cap cao hon)")
	void allowsLowerRankUnitUnderHigherRankParent() {
		validator = new DepartmentHierarchyValidator(departmentRepository);
		Department ban = departmentOfType(1L, DepartmentType.BAN);
		when(departmentRepository.findById(1L)).thenReturn(Optional.of(ban));

		assertThatCode(() -> validator.validate(DepartmentType.PHONG, 1L)).doesNotThrowAnyException();
	}

	@Test
	@DisplayName("Cho phep cung cap bac (vi du Phong truc thuoc Phong khac)")
	void allowsSameRankUnitUnderSameRankParent() {
		validator = new DepartmentHierarchyValidator(departmentRepository);
		Department phong = departmentOfType(3L, DepartmentType.PHONG);
		when(departmentRepository.findById(3L)).thenReturn(Optional.of(phong));

		assertThatCode(() -> validator.validate(DepartmentType.PHONG, 3L)).doesNotThrowAnyException();
	}

	@Test
	@DisplayName("Khong co bo phan cha (cap goc) thi luon hop le, khong can kiem tra")
	void allowsRootLevelRegardlessOfType() {
		validator = new DepartmentHierarchyValidator(departmentRepository);

		assertThatCode(() -> validator.validate(DepartmentType.TO, null)).doesNotThrowAnyException();
	}

	@Test
	@DisplayName("Trung Tam va Ban cung cap goc (rank 0) nen co the lam con lan nhau")
	void treatsTrungTamAndBanAsSameTopRank() {
		validator = new DepartmentHierarchyValidator(departmentRepository);
		Department trungTam = departmentOfType(6L, DepartmentType.TRUNG_TAM);
		when(departmentRepository.findById(6L)).thenReturn(Optional.of(trungTam));

		assertThatCode(() -> validator.validate(DepartmentType.BAN, 6L)).doesNotThrowAnyException();
	}
}
