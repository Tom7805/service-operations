package com.serviceops.modules.report;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.report.controller.ProjectPerformanceReportController;
import com.serviceops.modules.report.dto.response.ProjectPerformanceReportRes;
import com.serviceops.modules.report.dto.response.ProjectPerformanceRes;
import com.serviceops.modules.report.service.ProjectPerformanceReportService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NCL-11-CN-003 — tầng HTTP của {@code /reports/project-performance}: chỉ VT-02, giá vốn bị che với Quản lý dự án
 * (NCL-01-CN-005-TC-01), vai trò khác nhận 403 kèm nhật ký từ chối.
 */
@WebMvcTest(controllers = ProjectPerformanceReportController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ProjectPerformanceReportControllerIT {

	private static final String URL = "/reports/project-performance";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private ProjectPerformanceReportService projectPerformanceReportService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	/** TC-01: Quản lý dự án xem được giờ, doanh thu và biên; cột giá vốn bị che nhưng biên % vẫn hiện. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void managerReadsReportWithCostColumnsMasked() throws Exception {
		when(projectPerformanceReportService.getReport(null)).thenReturn(
				new ProjectPerformanceReportRes(null, 1, 0, 1, 1, List.of(row())));

		mockMvc.perform(get(URL))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.projectCount").value(1))
				.andExpect(jsonPath("$.data.projects[0].hoursVariance").value(150.00))
				.andExpect(jsonPath("$.data.projects[0].recognizedRevenue").value(95000000.00))
				.andExpect(jsonPath("$.data.projects[0].marginGapPercentPoints").value(-2.63))
				.andExpect(jsonPath("$.data.projects[0].hoursVarianceMarginImpactPercentPoints").value(-6.25))
				.andExpect(jsonPath("$.data.projects[0].plannedCost").value("***"))
				.andExpect(jsonPath("$.data.projects[0].actualCost").value("***"))
				.andExpect(jsonPath("$.data.projects[0].hoursVarianceCostImpact").value("***"));
	}

	/** TC-03: Kế toán cũng không thuộc vai trò Quản lý dự án nên bị từ chối. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void deniesAccountant() throws Exception {
		mockMvc.perform(get(URL))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/reports/project-performance"));
		verify(projectPerformanceReportService, never()).getReport(any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void passesStatusFilterToService() throws Exception {
		when(projectPerformanceReportService.getReport(ProjectStatus.CLOSED)).thenReturn(
				new ProjectPerformanceReportRes(ProjectStatus.CLOSED, 0, 0, 0, 0, List.of()));

		mockMvc.perform(get(URL).param("status", "CLOSED"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("CLOSED"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void invalidStatusReturnsBadRequest() throws Exception {
		mockMvc.perform(get(URL).param("status", "UNKNOWN"))
				.andExpect(status().isBadRequest());

		verify(projectPerformanceReportService, never()).getReport(any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void managerReadsSingleProjectReport() throws Exception {
		when(projectPerformanceReportService.getProjectReport(1L)).thenReturn(row());

		mockMvc.perform(get(URL + "/1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.projectCode").value("DA-01"))
				.andExpect(jsonPath("$.data.planAvailable").value(true));
	}

	/** QTN-01: dự án của quản lý khác -> 403 và ghi nhật ký lần từ chối. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesProjectOfAnotherManager() throws Exception {
		when(projectPerformanceReportService.getProjectReport(9L)).thenThrow(new AccessDeniedException("x"));

		mockMvc.perform(get(URL + "/9"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/reports/project-performance/9"));
	}

	/** TC-03: vai trò khác Quản lý dự án (ví dụ Ban giám đốc) bị 403 và hệ thống ghi nhật ký lần từ chối. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void deniesOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get(URL))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/reports/project-performance"));
		verify(projectPerformanceReportService, never()).getReport(any());
		verify(projectPerformanceReportService, never()).getProjectReport(anyLong());
	}

	@Test
	void rejectsRequestWithoutAuthentication() throws Exception {
		mockMvc.perform(get(URL))
				.andExpect(status().isUnauthorized());

		verify(projectPerformanceReportService, never()).getReport(any());
	}

	private static ProjectPerformanceRes row() {
		return new ProjectPerformanceRes(1L, "DA-01", "Du an 1", ProjectStatus.RUNNING, 3L, 500L, "HD-500",
				ContractType.TIME_AND_MATERIAL, true, 7L, 2,
				new BigDecimal("800.00"), new BigDecimal("950.00"), new BigDecimal("150.00"), new BigDecimal("18.75"),
				new BigDecimal("200000000.00"), new BigDecimal("95000000.00"), RecognitionMethod.HOURLY,
				new BigDecimal("47.50"),
				new BigDecimal("120000000.00"), new BigDecimal("60000000.00"), new BigDecimal("50000000.00"),
				new BigDecimal("50.00"), new BigDecimal("47.37"), new BigDecimal("-2.63"),
				new BigDecimal("7500000.00"), new BigDecimal("-6.25"),
				0, 0, 0, List.of("Giờ công thực tế vượt kế hoạch 150.00 giờ (18.75%)."));
	}
}
