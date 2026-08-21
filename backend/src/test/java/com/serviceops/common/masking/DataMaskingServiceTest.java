package com.serviceops.common.masking;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class DataMaskingServiceTest {
	private final DataMaskingServiceImpl service = new DataMaskingServiceImpl();

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void masksDataForRoleWithoutSensitiveDataPermission() {
		authenticateAs("VT-02");

		assertThat(service.canViewSensitiveData()).isFalse();
		assertThat(service.mask(new BigDecimal("1250000"))).isEqualTo("***");
	}

	@Test
	void allowsSensitiveDataForFinancialRoles() {
		for (String roleCode : new String[]{"VT-01", "VT-05", "VT-06"}) {
			authenticateAs(roleCode);

			assertThat(service.canViewSensitiveData()).isTrue();
			assertThat(service.mask(new BigDecimal("1250000"))).isEqualTo(new BigDecimal("1250000"));
		}
	}

	@Test
	void masksAnnotatedJsonField() throws Exception {
		authenticateAs("VT-02");

		String json = new ObjectMapper().writeValueAsString(new SensitiveResponse(new BigDecimal("1250000")));

		assertThat(json).contains("\"laborCost\":\"***\"");
	}

	private void authenticateAs(String roleCode) {
		TestingAuthenticationToken authentication = new TestingAuthenticationToken(
				"user", "password", "ROLE_" + roleCode);
		authentication.setAuthenticated(true);
		SecurityContextHolder.getContext().setAuthentication(authentication);
	}

	record SensitiveResponse(@MaskSensitive(MaskingLevel.COST) BigDecimal laborCost) {}
}
