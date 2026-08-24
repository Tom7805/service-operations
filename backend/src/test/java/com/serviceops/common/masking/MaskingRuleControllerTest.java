package com.serviceops.common.masking;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.masking.dto.MaskingRuleRes;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Kiem tra logic tra ve danh sach quy tac che du lieu (TC-04, phan man hinh
 * cau hinh). Viec tu choi truy cap doi voi vai tro khong duoc phep duoc bao
 * dam boi @PreAuthorize tren lop, cung co che voi DepartmentController/RoleController.
 */
class MaskingRuleControllerTest {

	@Test
	void returnsOneRulePerMaskingLevelWithTheCurrentAllowedRoles() {
		DataMaskingService dataMaskingService = mock(DataMaskingService.class);
		when(dataMaskingService.allowedRoles()).thenReturn(Set.of("VT-01", "VT-05", "VT-06"));
		MaskingRuleController controller = new MaskingRuleController(dataMaskingService);

		BaseRes<List<MaskingRuleRes>> response = controller.findAll();

		assertThat(response.isSuccess()).isTrue();
		assertThat(response.getData())
				.extracting(MaskingRuleRes::level)
				.containsExactlyInAnyOrder(MaskingLevel.SALARY, MaskingLevel.COST);
		assertThat(response.getData())
				.allSatisfy(rule -> assertThat(rule.allowedRoles()).containsExactlyInAnyOrder("VT-01", "VT-05", "VT-06"));
	}
}
