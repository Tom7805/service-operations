package com.serviceops.modules.profitability;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.profitability.controller.ProjectProfitabilityController;
import com.serviceops.modules.profitability.dto.response.PlannedVsActualMarginRes;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
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
class LaborCostControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private LaborCostService laborCostService;

	@MockBean
	private MarginComparisonService marginComparisonService;

	@MockBean
	private RevenueRecognitionService revenueRecognitionService;

	@MockBean
	private ProjectMarginService projectMarginService;

	@MockBean
	private MarginAlertService marginAlertService;

	@MockBean
	private ProfitForecastService profitForecastService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCanReadProjectLaborCost() throws Exception {
		when(laborCostService.calculateProjectLaborCost(42L)).thenReturn(
				new ProjectLaborCostRes(42L, new BigDecimal("8.00"), new BigDecimal("2000000.00"), 0, List.of()));

		mockMvc.perform(get("/projects/42/profitability/labor-cost"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.projectId").value(42))
				.andExpect(jsonPath("$.data.totalApprovedHours").value(8))
				.andExpect(jsonPath("$.data.totalLaborCost").value(2000000));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void specialistCannotReadProjectLaborCost() throws Exception {
		mockMvc.perform(get("/projects/42/profitability/labor-cost"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	/** NCL-09-CN-006-TC-01: PM xem duoc so sanh bien du kien voi thuc te. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void projectManagerCanReadPlannedVsActualMargin() throws Exception {
		when(marginComparisonService.compare(42L)).thenReturn(new PlannedVsActualMarginRes(
				42L, 7L, 2,
				new BigDecimal("20.00"), new BigDecimal("100000000.00"), new BigDecimal("70000000.00"),
				new BigDecimal("30000000.00"), new BigDecimal("30.00"),
				new BigDecimal("178.00"), new BigDecimal("100000000.00"), new BigDecimal("82000000.00"),
				new BigDecimal("18000000.00"), new BigDecimal("18.00"),
				new BigDecimal("-12.00"), new BigDecimal("18.00"),
				List.of("Gio cong thuc te vuot ke hoach 18.00 gio (tuong duong 2.25 ngay cong)."),
				0, 0, 0));

		mockMvc.perform(get("/projects/42/profitability/planned-vs-actual-margin"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.plannedMarginPercent").value(30.00))
				.andExpect(jsonPath("$.data.actualMarginPercent").value(18.00))
				.andExpect(jsonPath("$.data.marginGapPercentPoints").value(-12.00));
	}

	/** NCL-09-CN-006-TC-03: nguoi dung khong thuoc vai tro Quan ly du an bi tu choi. */
	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCannotReadPlannedVsActualMargin() throws Exception {
		mockMvc.perform(get("/projects/42/profitability/planned-vs-actual-margin"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}
}
