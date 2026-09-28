package com.serviceops.modules.profitability;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.profitability.controller.MarginAlertController;
import com.serviceops.modules.profitability.dto.response.MarginAlertRes;
import com.serviceops.modules.profitability.service.MarginAlertService;
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
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MarginAlertController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class MarginAlertControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private MarginAlertService marginAlertService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("Ban giam doc (VT-01) dat duoc nguong canh bao am bien")
	@WithMockUser(authorities = "ROLE_VT-01")
	void boardCanSetThreshold() throws Exception {
		when(marginAlertService.setThreshold(any())).thenReturn(
				new MarginAlertRes(new BigDecimal("0.1500"), "giamdoc", LocalDateTime.of(2026, 1, 1, 0, 0)));

		mockMvc.perform(put("/profitability/margin-alert-threshold")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"minMarginRate\": 0.15}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.minMarginRate").value(0.15));
	}

	@Test
	@DisplayName("NCL-09-CN-004-TC-03: Vai tro khac Ban giam doc bi tu choi dat nguong")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesNonBoardRoleFromSettingThreshold() throws Exception {
		mockMvc.perform(put("/profitability/margin-alert-threshold")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"minMarginRate\": 0.15}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Ke toan (VT-05) xem duoc nguong hien hanh")
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCanReadThreshold() throws Exception {
		when(marginAlertService.getThreshold()).thenReturn(
				new MarginAlertRes(new BigDecimal("0.1500"), "giamdoc", LocalDateTime.of(2026, 1, 1, 0, 0)));

		mockMvc.perform(get("/profitability/margin-alert-threshold"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.minMarginRate").value(0.15));
	}

	@Test
	@DisplayName("Chua co token thi tra 401")
	void deniesAnonymousAccess() throws Exception {
		mockMvc.perform(get("/profitability/margin-alert-threshold"))
				.andExpect(status().isUnauthorized());
	}
}
