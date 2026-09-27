package com.serviceops.modules.report;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.report.controller.RevenueReportController;
import com.serviceops.modules.report.dto.request.RevenueReportReq;
import com.serviceops.modules.report.dto.response.MonthlyRevenueReportRes;
import com.serviceops.modules.report.dto.response.MonthlyRevenueRes;
import com.serviceops.modules.report.service.RevenueReportService;
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
import java.time.YearMonth;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** NCL-11-CN-005 — tầng HTTP của {@code /reports/revenue/monthly}: VT-01 và VT-05 xem được, vai trò khác 403. */
@WebMvcTest(controllers = RevenueReportController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class RevenueReportControllerIT {

	private static final String URL = "/reports/revenue/monthly";
	private static final YearMonth JAN = YearMonth.of(2026, 1);

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private RevenueReportService revenueReportService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	/** TC-01: Ban giám đốc xem được; tháng trả dạng "yyyy-MM", doanh thu tách theo loại hợp đồng. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void directorReadsMonthlyRevenue() throws Exception {
		when(revenueReportService.getMonthlyRevenue(new RevenueReportReq(JAN, JAN))).thenReturn(report());

		mockMvc.perform(get(URL).param("fromMonth", "2026-01").param("toMonth", "2026-01"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.fromMonth").value("2026-01"))
				.andExpect(jsonPath("$.data.hasData").value(true))
				.andExpect(jsonPath("$.data.months[0].month").value("2026-01"))
				.andExpect(jsonPath("$.data.months[0].byContractType.TIME_AND_MATERIAL").value(10000000.00))
				.andExpect(jsonPath("$.data.months[0].changePercent").value(25.00));
	}

	/** TC-03: Kế toán cũng được xem. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantReadsMonthlyRevenue() throws Exception {
		when(revenueReportService.getMonthlyRevenue(any())).thenReturn(report());

		mockMvc.perform(get(URL).param("fromMonth", "2026-01").param("toMonth", "2026-01"))
				.andExpect(status().isOk());
	}

	/** TC-03: vai trò khác (Quản lý dự án) bị 403 và ghi nhật ký lần từ chối. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get(URL).param("fromMonth", "2026-01").param("toMonth", "2026-01"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/reports/revenue/monthly"));
		verify(revenueReportService, never()).getMonthlyRevenue(any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void invalidPeriodReturnsValidationError() throws Exception {
		mockMvc.perform(get(URL).param("fromMonth", "2026-12").param("toMonth", "2026-01"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
		mockMvc.perform(get(URL).param("fromMonth", "2026-13").param("toMonth", "2026-01"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
		mockMvc.perform(get(URL).param("fromMonth", "2026-01"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

		verify(revenueReportService, never()).getMonthlyRevenue(any());
	}

	@Test
	void rejectsRequestWithoutAuthentication() throws Exception {
		mockMvc.perform(get(URL).param("fromMonth", "2026-01").param("toMonth", "2026-01"))
				.andExpect(status().isUnauthorized());
	}

	private static MonthlyRevenueReportRes report() {
		Map<ContractType, BigDecimal> byType = new EnumMap<>(ContractType.class);
		for (ContractType type : ContractType.values()) {
			byType.put(type, new BigDecimal("0.00"));
		}
		byType.put(ContractType.TIME_AND_MATERIAL, new BigDecimal("10000000.00"));
		MonthlyRevenueRes jan = new MonthlyRevenueRes(JAN, new BigDecimal("10000000.00"), byType,
				new BigDecimal("8000000.00"), new BigDecimal("25.00"));
		return new MonthlyRevenueReportRes(JAN, JAN, true, new BigDecimal("10000000.00"), byType,
				new BigDecimal("8000000.00"), new BigDecimal("25.00"), List.of(jan), 0, List.of());
	}
}
