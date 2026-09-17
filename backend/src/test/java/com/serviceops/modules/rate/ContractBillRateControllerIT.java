package com.serviceops.modules.rate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.rate.controller.ContractBillRateController;
import com.serviceops.modules.rate.dto.request.ContractBillRateCreateReq;
import com.serviceops.modules.rate.dto.response.ContractBillRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedContractBillRateRes;
import com.serviceops.modules.rate.service.ContractBillRateService;
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

@WebMvcTest(controllers = ContractBillRateController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ContractBillRateControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private ContractBillRateService contractBillRateService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("Ke toan (VT-05) khai bao don gia rieng thanh cong")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToCreateContractBillRate() throws Exception {
		ContractBillRateCreateReq req = new ContractBillRateCreateReq("Lập trình viên", "Cao cấp",
				new BigDecimal("3000000"), LocalDate.of(2026, 1, 1));
		ContractBillRateRes res = new ContractBillRateRes(1L, "Lập trình viên", "Cao cấp",
				new BigDecimal("3000000"), LocalDate.of(2026, 1, 1));

		when(contractBillRateService.create(eq(1L), any())).thenReturn(res);

		mockMvc.perform(post("/contracts/1/bill-rates")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.contractId").value(1))
				.andExpect(jsonPath("$.data.dailyRate").value(3000000));
	}

	@Test
	@DisplayName("TC-03: Nguoi dung khong thuoc vai tro Ke toan mo chuc nang khai bao don gia rieng thi tu choi 403")
	@WithMockUser(authorities = "ROLE_VT-04")
	void deniesNonAccountantFromCreatingContractBillRate() throws Exception {
		ContractBillRateCreateReq req = new ContractBillRateCreateReq("Lập trình viên", "Cao cấp",
				new BigDecimal("3000000"), LocalDate.of(2026, 1, 1));

		mockMvc.perform(post("/contracts/1/bill-rates")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Tra cuu don gia hop dong thanh cong tra isContractSpecific")
	@WithMockUser(authorities = "ROLE_VT-05")
	void resolvesContractBillRateSuccessfully() throws Exception {
		ResolvedContractBillRateRes res = new ResolvedContractBillRateRes(new BigDecimal("3000000"), LocalDate.of(2026, 1, 1), true);
		when(contractBillRateService.resolve(eq(1L), eq("Lập trình viên"), eq("Cao cấp"), eq(LocalDate.of(2026, 6, 30))))
				.thenReturn(res);

		mockMvc.perform(get("/contracts/1/bill-rates/resolve")
						.param("professionalRole", "Lập trình viên")
						.param("level", "Cao cấp")
						.param("asOf", "2026-06-30"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.dailyRate").value(3000000))
				.andExpect(jsonPath("$.data.isContractSpecific").value(true));
	}
}

