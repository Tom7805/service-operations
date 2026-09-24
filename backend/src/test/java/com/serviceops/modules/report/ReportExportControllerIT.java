package com.serviceops.modules.report;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.report.controller.ReportExportController;
import com.serviceops.modules.report.dto.request.ReportExportReq;
import com.serviceops.modules.report.dto.response.ReportFileRes;
import com.serviceops.modules.report.enums.ReportFormat;
import com.serviceops.modules.report.enums.ReportType;
import com.serviceops.modules.report.service.ReportExportService;
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

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** NCL-11-CN-004 — tầng HTTP của {@code /reports/export}: chỉ VT-02, trả tệp tải về, lỗi vẫn là JSON chuẩn. */
@WebMvcTest(controllers = ReportExportController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ReportExportControllerIT {

	private static final String URL = "/reports/export";
	private static final LocalDate FROM = LocalDate.of(2026, 7, 1);
	private static final LocalDate TO = LocalDate.of(2026, 9, 30);

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private ReportExportService reportExportService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	/** TC-01: Quản lý dự án chọn kỳ và nhận về tệp CSV tải xuống. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void managerDownloadsReportFile() throws Exception {
		byte[] body = "﻿Mã dự án\r\nDA-01\r\n".getBytes(StandardCharsets.UTF_8);
		when(reportExportService.export(new ReportExportReq(ReportType.PROJECT_PERFORMANCE, FROM, TO,
				ReportFormat.CSV))).thenReturn(new ReportFileRes("bao-cao-hieu-qua-du-an_2026-07-01_2026-09-30.csv",
				"text/csv; charset=UTF-8", body, 1));

		mockMvc.perform(get(URL).param("reportType", "PROJECT_PERFORMANCE")
						.param("from", "2026-07-01").param("to", "2026-09-30"))
				.andExpect(status().isOk())
				.andExpect(header().string("Content-Type", containsString("text/csv")))
				.andExpect(header().string("Content-Disposition", containsString("attachment")))
				.andExpect(header().string("Content-Disposition",
						containsString("bao-cao-hieu-qua-du-an_2026-07-01_2026-09-30.csv")))
				.andExpect(header().string("X-Report-Row-Count", "1"))
				.andExpect(content().bytes(body));
	}

	/** TC-02: kỳ không có dữ liệu -> lỗi JSON báo không có dữ liệu để xuất. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void emptyPeriodReturnsJsonError() throws Exception {
		when(reportExportService.export(any())).thenThrow(
				new BusinessRuleException(ErrorCode.INVALID_STATE, "Khong co du lieu de xuat trong ky"));

		mockMvc.perform(get(URL).param("reportType", "PROJECT_PERFORMANCE")
						.param("from", "2026-07-01").param("to", "2026-09-30"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"))
				.andExpect(jsonPath("$.message").value("Khong co du lieu de xuat trong ky"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void invalidPeriodReturnsValidationError() throws Exception {
		mockMvc.perform(get(URL).param("reportType", "PROJECT_PERFORMANCE")
						.param("from", "2026-09-30").param("to", "2026-07-01"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

		verify(reportExportService, never()).export(any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void unknownReportTypeReturnsBadRequest() throws Exception {
		mockMvc.perform(get(URL).param("reportType", "UNKNOWN")
						.param("from", "2026-07-01").param("to", "2026-09-30"))
				.andExpect(status().isBadRequest());

		verify(reportExportService, never()).export(any());
	}

	/** TC-03: vai trò khác Quản lý dự án bị 403 và hệ thống ghi nhật ký lần từ chối. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void deniesOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get(URL).param("reportType", "PROJECT_PERFORMANCE")
						.param("from", "2026-07-01").param("to", "2026-09-30"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/reports/export"));
		verify(reportExportService, never()).export(any());
	}

	@Test
	void rejectsRequestWithoutAuthentication() throws Exception {
		mockMvc.perform(get(URL).param("reportType", "PROJECT_PERFORMANCE")
						.param("from", "2026-07-01").param("to", "2026-09-30"))
				.andExpect(status().isUnauthorized());

		verify(reportExportService, never()).export(any());
	}
}
