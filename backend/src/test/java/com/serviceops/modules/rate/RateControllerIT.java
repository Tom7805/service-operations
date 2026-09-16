package com.serviceops.modules.rate;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.rate.controller.RateLookupController;
import com.serviceops.modules.rate.dto.response.ResolvedRateRes;
import com.serviceops.modules.rate.service.RateResolutionService;
import com.serviceops.modules.timesheet.enums.WorkType;
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
import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RateLookupController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class RateControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private RateResolutionService rateResolutionService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("Ke toan (VT-05) tra cuu don gia ap dung cho dong gio cong thanh cong")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToResolveRateForTimeEntry() throws Exception {
		ResolvedRateRes res = new ResolvedRateRes(100L, 5L, 2L, 1L, "Lập trình viên", "Cao cấp",
				LocalDate.of(2026, 6, 30), new BigDecimal("8.00"), WorkType.NORMAL,
				new BigDecimal("3000000"), LocalDate.of(2026, 1, 1), true,
				new BigDecimal("1.00"), new BigDecimal("3000000.00"));

		when(rateResolutionService.resolveForTimeEntry(eq(100L), any())).thenReturn(res);

		mockMvc.perform(get("/timesheet-entries/100/bill-rate/resolve")
						.param("level", "Cao cấp"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.timeEntryId").value(100))
				.andExpect(jsonPath("$.data.dailyRate").value(3000000))
				.andExpect(jsonPath("$.data.isContractSpecific").value(true));
	}

	@Test
	@DisplayName("Quan tri vien (VT-07) cung duoc phep tra cuu")
	@WithMockUser(authorities = "ROLE_VT-07")
	void allowsAdminToResolveRateForTimeEntry() throws Exception {
		ResolvedRateRes res = new ResolvedRateRes(100L, 5L, 2L, 1L, "Lập trình viên", "Cao cấp",
				LocalDate.of(2026, 6, 30), new BigDecimal("8.00"), WorkType.NORMAL,
				new BigDecimal("1600000"), LocalDate.of(2024, 1, 1), false,
				new BigDecimal("1.00"), new BigDecimal("1600000.00"));

		when(rateResolutionService.resolveForTimeEntry(eq(100L), any())).thenReturn(res);

		mockMvc.perform(get("/timesheet-entries/100/bill-rate/resolve")
						.param("level", "Cao cấp"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.isContractSpecific").value(false));
	}

	@Test
	@DisplayName("TC-03: Nguoi dung khong thuoc Ke toan/Quan tri vien bi tu choi 403")
	@WithMockUser(authorities = "ROLE_VT-03")
	void deniesOtherRolesFromResolvingRate() throws Exception {
		mockMvc.perform(get("/timesheet-entries/100/bill-rate/resolve")
						.param("level", "Cao cấp"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Thieu tham so level thi tra 400")
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsMissingLevelParam() throws Exception {
		mockMvc.perform(get("/timesheet-entries/100/bill-rate/resolve"))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("Chua co token thi tra 401")
	void deniesAnonymousAccess() throws Exception {
		mockMvc.perform(get("/timesheet-entries/100/bill-rate/resolve")
						.param("level", "Cao cấp"))
				.andExpect(status().isUnauthorized());
	}
}
