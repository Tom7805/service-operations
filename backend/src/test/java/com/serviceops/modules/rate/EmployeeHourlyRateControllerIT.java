package com.serviceops.modules.rate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.rate.controller.EmployeeHourlyRateController;
import com.serviceops.modules.rate.dto.request.EmployeeHourlyRateCreateReq;
import com.serviceops.modules.rate.dto.response.EmployeeHourlyRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;
import com.serviceops.modules.rate.service.EmployeeHourlyRateService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = EmployeeHourlyRateController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class EmployeeHourlyRateControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private EmployeeHourlyRateService employeeHourlyRateService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("Nhan su (VT-06) khai bao chi phi gio cong thanh cong")
	@WithMockUser(authorities = "ROLE_VT-06")
	void allowsHRToCreateEmployeeHourlyRate() throws Exception {
		EmployeeHourlyRateCreateReq req = new EmployeeHourlyRateCreateReq(new BigDecimal("250000"), LocalDate.of(2026, 1, 1));
		EmployeeHourlyRateRes res = new EmployeeHourlyRateRes(100L, 1L, new BigDecimal("250000"), LocalDate.of(2026, 1, 1));

		when(employeeHourlyRateService.create(eq(1L), any())).thenReturn(res);

		mockMvc.perform(post("/employees/1/rates")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.employeeId").value(1))
				.andExpect(jsonPath("$.data.hourlyRate").value(250000));
	}

	@Test
	@DisplayName("TC-02: Quan ly du an (VT-02) mo man hinh chi phi gio cong thi tu choi 403")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesPMFromAccessingEmployeeHourlyRate() throws Exception {
		mockMvc.perform(get("/employees/1/rates"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Ke toan (VT-05) duoc phep xem va tra cuu chi phi gio cong de tính gia von")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToResolveEmployeeHourlyRate() throws Exception {
		ResolvedEmployeeHourlyRateRes res = new ResolvedEmployeeHourlyRateRes(1L, new BigDecimal("250000"), LocalDate.of(2026, 1, 1), false);
		when(employeeHourlyRateService.resolve(eq(1L), eq(LocalDate.of(2026, 6, 1)))).thenReturn(res);

		mockMvc.perform(get("/employees/1/rates/resolve")
						.param("asOf", "2026-06-01"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.hourlyRate").value(250000))
				.andExpect(jsonPath("$.data.missingCostData").value(false));
	}
}

