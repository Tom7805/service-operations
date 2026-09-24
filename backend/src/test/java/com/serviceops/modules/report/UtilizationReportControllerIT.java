package com.serviceops.modules.report;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.report.controller.UtilizationReportController;
import com.serviceops.modules.report.dto.response.UtilizationByDepartmentRes;
import com.serviceops.modules.report.dto.response.UtilizationEmployeeRes;
import com.serviceops.modules.report.dto.response.UtilizationRes;
import com.serviceops.modules.report.service.UtilizationReportService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NCL-11-CN-002 — tầng HTTP của {@code GET /reports/utilization}: chỉ VT-01, vai trò khác nhận 403 kèm nhật ký từ chối.
 */
@WebMvcTest(controllers = UtilizationReportController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class UtilizationReportControllerIT {

	private static final String URL = "/reports/utilization";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private UtilizationReportService utilizationReportService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	/** TC-01: Ban giám đốc xem được tỷ lệ theo người, bộ phận và toàn công ty. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void directorCanReadUtilizationReport() throws Exception {
		when(utilizationReportService.getReport(any())).thenReturn(new UtilizationRes(
				LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28),
				new BigDecimal("120.00"), new BigDecimal("160.00"), new BigDecimal("0.7500"), BigDecimal.ZERO,
				List.of(new UtilizationByDepartmentRes(1L, "Phong ky thuat", 1, new BigDecimal("120.00"),
						new BigDecimal("160.00"), new BigDecimal("0.7500"))),
				List.of(new UtilizationEmployeeRes(11L, 201L, "Nhan su A", "Ky su", 1L, "Phong ky thuat",
						new BigDecimal("120.00"), new BigDecimal("160.00"), new BigDecimal("0.7500")))));

		mockMvc.perform(get(URL).param("from", "2026-02-01").param("to", "2026-02-28"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.totalRatio").value(0.75))
				.andExpect(jsonPath("$.data.departments[0].departmentName").value("Phong ky thuat"))
				.andExpect(jsonPath("$.data.employees[0].fullName").value("Nhan su A"))
				.andExpect(jsonPath("$.data.employees[0].ratio").value(0.75));
	}

	/** TC-04: vai trò khác Ban giám đốc bị 403 và hệ thống ghi nhật ký lần từ chối. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get(URL).param("from", "2026-02-01").param("to", "2026-02-28"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/reports/utilization"));
		verify(utilizationReportService, never()).getReport(any());
	}

	@Test
	void rejectsRequestWithoutAuthentication() throws Exception {
		mockMvc.perform(get(URL).param("from", "2026-02-01").param("to", "2026-02-28"))
				.andExpect(status().isUnauthorized());

		verify(utilizationReportService, never()).getReport(any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void missingPeriodParamReturnsBadRequest() throws Exception {
		mockMvc.perform(get(URL).param("from", "2026-02-01"))
				.andExpect(status().isBadRequest());

		verify(utilizationReportService, never()).getReport(any());
	}
}
