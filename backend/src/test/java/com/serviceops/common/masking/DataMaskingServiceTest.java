package com.serviceops.common.masking;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;

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

	@Test
	void masksEachSensitiveFieldIndependentlyInAReportRow() throws Exception {
		authenticateAs("VT-02");

		String json = new ObjectMapper().writeValueAsString(
				new ProjectMarginRow(new BigDecimal("500000000"), new BigDecimal("320000000")));

		assertThat(json).contains("\"revenue\":500000000");
		assertThat(json).contains("\"laborCost\":\"***\"");
	}

	@Test
	void masksSensitiveFieldInsideAListForNonPermittedRole() throws Exception {
		authenticateAs("VT-04");

		String json = new ObjectMapper().writeValueAsString(
				List.of(new SensitiveResponse(new BigDecimal("1000000")), new SensitiveResponse(new BigDecimal("2000000"))));

		assertThat(json).doesNotContain("1000000", "2000000");
		assertThat(json).contains("\"laborCost\":\"***\"");
	}

	@Test
	void revealsSensitiveFieldInsideAListForPermittedRole() throws Exception {
		authenticateAs("VT-06");

		String json = new ObjectMapper().writeValueAsString(
				List.of(new SensitiveResponse(new BigDecimal("1000000"))));

		assertThat(json).contains("\"laborCost\":1000000");
	}

	@Test
	void exposesTheSetOfRolesAllowedToViewSensitiveData() {
		assertThat(service.allowedRoles()).containsExactlyInAnyOrder("VT-01", "VT-05", "VT-06");
	}

	private void authenticateAs(String roleCode) {
		TestingAuthenticationToken authentication = new TestingAuthenticationToken(
				"user", "password", "ROLE_" + roleCode);
		authentication.setAuthenticated(true);
		SecurityContextHolder.getContext().setAuthentication(authentication);
	}

	record SensitiveResponse(@MaskSensitive(MaskingLevel.COST) BigDecimal laborCost) {}

	record ProjectMarginRow(BigDecimal revenue, @MaskSensitive(MaskingLevel.COST) BigDecimal laborCost) {}
}
