package com.serviceops.modules.profitability;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.profitability.controller.ProfitAnalysisController;
import com.serviceops.modules.profitability.dto.response.MarginByCustomerRes;
import com.serviceops.modules.profitability.dto.response.MarginByEmployeeRes;
import com.serviceops.modules.profitability.service.MarginReportService;
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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NCL-09-CN-005 — kiem thu tang controller: phan quyen (chi VT-01) va tra du lieu dung dinh dang.
 */
@WebMvcTest(controllers = ProfitAnalysisController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ProfitAnalysisControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private MarginReportService marginReportService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	/** TC-01: Ban giam doc xem duoc bao cao bien loi nhuan theo khach hang. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void directorCanReadMarginByCustomer() throws Exception {
		when(marginReportService.marginByCustomer(any())).thenReturn(new MarginByCustomerRes(
				LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31),
				new BigDecimal("6000000.00"), new BigDecimal("2400000.00"), new BigDecimal("3600000.00"),
				new BigDecimal("60.00"), List.of(), 0, 0));

		mockMvc.perform(get("/reports/margin/by-customer")
						.param("from", "2026-01-01")
						.param("to", "2026-01-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.totalRevenue").value(6000000))
				.andExpect(jsonPath("$.data.totalMargin").value(3600000));
	}

	/** TC-02: Quan ly du an (VT-02) bi tu choi khi mo bao cao bien loi nhuan theo nhan su. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void projectManagerCannotReadMarginByEmployee() throws Exception {
		mockMvc.perform(get("/reports/margin/by-employee")
						.param("from", "2026-01-01")
						.param("to", "2026-01-31"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	/** TC-02 (mo rong): vai tro khac VT-01 cung bi tu choi voi bao cao theo khach hang. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCannotReadMarginByCustomerEither() throws Exception {
		mockMvc.perform(get("/reports/margin/by-customer")
						.param("from", "2026-01-01")
						.param("to", "2026-01-31"))
				.andExpect(status().isForbidden());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void directorCanReadMarginByEmployee() throws Exception {
		when(marginReportService.marginByEmployee(any())).thenReturn(new MarginByEmployeeRes(
				LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31),
				BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, null, List.of(), 0, 0));

		mockMvc.perform(get("/reports/margin/by-employee")
						.param("from", "2026-01-01")
						.param("to", "2026-01-31"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	/** Thieu tham so bat buoc -> 400, khong phai 500. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void missingRequiredParamsReturnsBadRequest() throws Exception {
		mockMvc.perform(get("/reports/margin/by-customer").param("from", "2026-01-01"))
				.andExpect(status().isBadRequest());
	}
}
