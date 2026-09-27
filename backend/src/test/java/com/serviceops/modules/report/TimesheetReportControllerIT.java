package com.serviceops.modules.report;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.report.controller.TimesheetReportController;
import com.serviceops.modules.report.dto.response.TimesheetByEmployeeRes;
import com.serviceops.modules.report.dto.response.TimesheetEmployeeProjectRow;
import com.serviceops.modules.report.service.TimesheetReportService;
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
 * NCL-11-CN-006 — tầng HTTP của {@code /reports/timesheet}: chỉ VT-02, vai trò khác nhận 403 kèm nhật ký từ chối.
 */
@WebMvcTest(controllers = TimesheetReportController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class TimesheetReportControllerIT {

	private static final String URL = "/reports/timesheet";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private TimesheetReportService timesheetReportService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	/** TC-01: Quản lý dự án xem được lưới giờ công người × dự án, tách billable/non-billable. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void managerReadsReport() throws Exception {
		LocalDate from = LocalDate.of(2026, 9, 1);
		LocalDate to = LocalDate.of(2026, 9, 30);
		TimesheetEmployeeProjectRow row = new TimesheetEmployeeProjectRow(1L, "Nguyen Van A", 500L, "DA-01",
				"Du an 1", new BigDecimal("40.00"), new BigDecimal("5.00"), new BigDecimal("45.00"));
		when(timesheetReportService.getReport(from, to)).thenReturn(new TimesheetByEmployeeRes(from, to, 1, 1,
				new BigDecimal("40.00"), new BigDecimal("5.00"), new BigDecimal("45.00"), List.of(row)));

		mockMvc.perform(get(URL).param("from", "2026-09-01").param("to", "2026-09-30"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.employeeCount").value(1))
				.andExpect(jsonPath("$.data.rows[0].billableHours").value(40.00))
				.andExpect(jsonPath("$.data.rows[0].nonBillableHours").value(5.00))
				.andExpect(jsonPath("$.data.rows[0].totalHours").value(45.00));
	}

	/** TC-03: Kế toán không thuộc vai trò Quản lý dự án nên bị từ chối. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void deniesAccountant() throws Exception {
		mockMvc.perform(get(URL).param("from", "2026-09-01").param("to", "2026-09-30"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/reports/timesheet"));
		verify(timesheetReportService, never()).getReport(any(), any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void missingDateParamsReturnsBadRequest() throws Exception {
		mockMvc.perform(get(URL))
				.andExpect(status().isBadRequest());

		verify(timesheetReportService, never()).getReport(any(), any());
	}

	@Test
	void rejectsRequestWithoutAuthentication() throws Exception {
		mockMvc.perform(get(URL).param("from", "2026-09-01").param("to", "2026-09-30"))
				.andExpect(status().isUnauthorized());

		verify(timesheetReportService, never()).getReport(any(), any());
	}
}
