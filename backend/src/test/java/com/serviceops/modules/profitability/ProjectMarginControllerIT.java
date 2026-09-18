package com.serviceops.modules.profitability;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.profitability.controller.ProjectProfitabilityController;
import com.serviceops.modules.profitability.dto.response.ProjectMarginRes;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.MarginAlertService;
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
class ProjectMarginControllerIT {

	@Autowired private MockMvc mockMvc;
	@MockBean private ProjectMarginService projectMarginService;
	@MockBean private LaborCostService laborCostService;
	@MockBean private RevenueRecognitionService revenueRecognitionService;
	@MockBean private MarginAlertService marginAlertService;
	@MockBean private com.serviceops.modules.profitability.service.MarginComparisonService marginComparisonService;
	@MockBean private JwtProvider jwtProvider;
	@MockBean private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void projectManagerCanReadProjectMargin() throws Exception {
		when(projectMarginService.calculateProjectMargin(42L)).thenReturn(
				new ProjectMarginRes(42L, new BigDecimal("5000000.00"), new BigDecimal("3000000.00"),
						BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("3000000.00"), new BigDecimal("2000000.00"),
						new BigDecimal("0.4000"), 0, 0, List.of(), List.of()));

		mockMvc.perform(get("/projects/42/profitability/margin"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.projectId").value(42))
				.andExpect(jsonPath("$.data.grossProfit").value(2000000))
				.andExpect(jsonPath("$.data.marginRate").value(0.4));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void specialistCannotReadProjectMargin() throws Exception {
		mockMvc.perform(get("/projects/42/profitability/margin"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}
}