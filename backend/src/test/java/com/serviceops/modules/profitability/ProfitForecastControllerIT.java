package com.serviceops.modules.profitability;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.profitability.controller.ProjectProfitabilityController;
import com.serviceops.modules.profitability.dto.response.ProfitForecastRes;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.MarginAlertService;
import com.serviceops.modules.profitability.service.MarginComparisonService;
import com.serviceops.modules.profitability.service.ProfitForecastService;
import com.serviceops.modules.profitability.service.ProjectMarginService;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
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
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProjectProfitabilityController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ProfitForecastControllerIT {

	@Autowired private MockMvc mockMvc;
	@MockBean private ProfitForecastService profitForecastService;
	@MockBean private ProjectMarginService projectMarginService;
	@MockBean private LaborCostService laborCostService;
	@MockBean private RevenueRecognitionService revenueRecognitionService;
	@MockBean private MarginAlertService marginAlertService;
	@MockBean private MarginComparisonService marginComparisonService;
	@MockBean private JwtProvider jwtProvider;
	@MockBean private CustomUserDetailsService customUserDetailsService;

	/** NCL-09-CN-007-TC-03: Quan ly du an (VT-02) xem duoc du bao loi nhuan toi khi ket thuc du an. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void projectManagerCanReadProfitForecast() throws Exception {
		when(profitForecastService.forecast(42L)).thenReturn(new ProfitForecastRes(42L,
				new BigDecimal("1000.00"), new BigDecimal("600.00"), new BigDecimal("400.00"), false,
				null, new BigDecimal("1000.00"),
				new BigDecimal("90000000.00"), new BigDecimal("60000000.00"), new BigDecimal("30000000.00"), new BigDecimal("33.33"),
				new BigDecimal("150000000.00"), new BigDecimal("100000000.00"), new BigDecimal("50000000.00"), new BigDecimal("33.33"),
				BigDecimal.ZERO, false, List.of()));

		mockMvc.perform(get("/projects/42/profitability/profit-forecast"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.projectId").value(42))
				.andExpect(jsonPath("$.data.remainingHours").value(400))
				.andExpect(jsonPath("$.data.forecastMargin").value(50000000))
				.andExpect(jsonPath("$.data.riskOfLoss").value(false));
	}

	/** NCL-09-CN-007-TC-03: vai tro khac VT-02 bi tu choi truy cap. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCannotReadProfitForecast() throws Exception {
		mockMvc.perform(get("/projects/42/profitability/profit-forecast"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}
}
