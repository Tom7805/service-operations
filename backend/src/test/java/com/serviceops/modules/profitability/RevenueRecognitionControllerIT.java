package com.serviceops.modules.profitability;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.profitability.controller.ProjectProfitabilityController;
import com.serviceops.modules.profitability.dto.response.RecognizedRevenueRes;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.profitability.service.LaborCostService;
import com.serviceops.modules.profitability.service.RevenueRecognitionService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import org.junit.jupiter.api.DisplayName;
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
class RevenueRecognitionControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private RevenueRecognitionService revenueRecognitionService;

	@MockBean
	private LaborCostService laborCostService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("NCL-09-CN-002-TC-04: Ke toan (VT-05) xem duoc doanh thu ghi nhan")
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCanReadRecognizedRevenue() throws Exception {
		when(revenueRecognitionService.calculateRecognizedRevenue(42L)).thenReturn(
				new RecognizedRevenueRes(42L, 5L, ContractType.TIME_AND_MATERIAL, RecognitionMethod.HOURLY,
						new BigDecimal("2400000.00"), new BigDecimal("8.00"), 0, 0, null, null, null, List.of()));

		mockMvc.perform(get("/projects/42/profitability/revenue"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.projectId").value(42))
				.andExpect(jsonPath("$.data.totalRecognizedRevenue").value(2400000.00));
	}

	@Test
	@DisplayName("NCL-09-CN-002-TC-04: Ban giam doc (VT-01) xem duoc doanh thu ghi nhan")
	@WithMockUser(authorities = "ROLE_VT-01")
	void boardCanReadRecognizedRevenue() throws Exception {
		when(revenueRecognitionService.calculateRecognizedRevenue(42L)).thenReturn(
				new RecognizedRevenueRes(42L, 5L, ContractType.FIXED_PRICE, RecognitionMethod.PERCENTAGE_OF_COMPLETION,
						new BigDecimal("60000000.00"), null, 0, 0, new BigDecimal("0.6000"), 5, 3, List.of()));

		mockMvc.perform(get("/projects/42/profitability/revenue"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.completionRate").value(0.6));
	}

	@Test
	@DisplayName("NCL-09-CN-002-TC-04: Vai tro khac bi tu choi 403")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesFromReadingRecognizedRevenue() throws Exception {
		mockMvc.perform(get("/projects/42/profitability/revenue"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}
}
