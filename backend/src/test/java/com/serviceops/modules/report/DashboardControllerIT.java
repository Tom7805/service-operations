package com.serviceops.modules.report;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.report.controller.DashboardController;
import com.serviceops.modules.report.dto.response.DashboardKpiRes;
import com.serviceops.modules.report.dto.response.DashboardSummaryRes;
import com.serviceops.modules.report.service.DashboardService;
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
 * NCL-11-CN-001 — tầng HTTP của {@code GET /reports/dashboard}: chỉ VT-01, vai trò khác nhận 403 kèm nhật ký từ chối.
 */
@WebMvcTest(controllers = DashboardController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class DashboardControllerIT {

	private static final String URL = "/reports/dashboard";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private DashboardService dashboardService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	/** TC-01: Ban giám đốc xem được đủ các chỉ số chính của kỳ. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void directorCanReadDashboard() throws Exception {
		when(dashboardService.getSummary(any())).thenReturn(new DashboardSummaryRes(
				LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31),
				new DashboardKpiRes(new BigDecimal("4000000.00"), new BigDecimal("0.1000"),
						new BigDecimal("0.4444"), 1, 2),
				0, 0));

		mockMvc.perform(get(URL).param("from", "2026-01-01").param("to", "2026-01-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.kpis.recognizedRevenue").value(4000000.00))
				.andExpect(jsonPath("$.data.kpis.averageMarginRate").value(0.1))
				.andExpect(jsonPath("$.data.kpis.billableHoursRatio").value(0.4444))
				.andExpect(jsonPath("$.data.kpis.negativeMarginProjectCount").value(1))
				.andExpect(jsonPath("$.data.kpis.overdueInvoiceCount").value(2));
	}

	/** TC-03: vai trò khác Ban giám đốc bị 403 và hệ thống ghi nhật ký lần từ chối. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get(URL).param("from", "2026-01-01").param("to", "2026-01-31"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/reports/dashboard"));
		verify(dashboardService, never()).getSummary(any());
	}

	@Test
	void rejectsRequestWithoutAuthentication() throws Exception {
		mockMvc.perform(get(URL).param("from", "2026-01-01").param("to", "2026-01-31"))
				.andExpect(status().isUnauthorized());

		verify(dashboardService, never()).getSummary(any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void missingPeriodParamReturnsBadRequest() throws Exception {
		mockMvc.perform(get(URL).param("from", "2026-01-01"))
				.andExpect(status().isBadRequest());

		verify(dashboardService, never()).getSummary(any());
	}
}
