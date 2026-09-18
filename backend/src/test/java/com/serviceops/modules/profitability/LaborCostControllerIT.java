package com.serviceops.modules.profitability;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.profitability.controller.ProjectProfitabilityController;
import com.serviceops.modules.profitability.dto.response.ProjectLaborCostRes;
import com.serviceops.modules.profitability.service.LaborCostService;
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
}
