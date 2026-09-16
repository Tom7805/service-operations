package com.serviceops.modules.rate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.rate.controller.BillRateController;
import com.serviceops.modules.rate.dto.request.BillRateCreateReq;
import com.serviceops.modules.rate.dto.response.BillRateRes;
import com.serviceops.modules.rate.service.BillRateService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = BillRateController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class BillRateControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private BillRateService billRateService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("Ke toan (VT-05) tao bang don gia thanh cong")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToCreateBillRate() throws Exception {
		BillRateCreateReq req = new BillRateCreateReq("Lập trình viên cao cấp", "Cao cấp", new BigDecimal("2500000"), LocalDate.of(2025, 1, 1));
		BillRateRes res = new BillRateRes("Lập trình viên cao cấp", "Cao cấp", new BigDecimal("2500000"), LocalDate.of(2025, 1, 1));
		when(billRateService.create(any())).thenReturn(res);

		mockMvc.perform(post("/bill-rates")
					.contentType("application/json")
					.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.professionalRole").value("Lập trình viên cao cấp"))
				.andExpect(jsonPath("$.data.level").value("Cao cấp"))
				.andExpect(jsonPath("$.data.dailyRate").value(2500000));
	}

	@Test
	@DisplayName("Vai tro khong phai ke toan hoac quan tri vien bi tu choi")
	@WithMockUser(authorities = "ROLE_VT-04")
	void deniesOtherRoles() throws Exception {
		BillRateCreateReq req = new BillRateCreateReq("Lập trình viên cao cấp", "Cao cấp", new BigDecimal("2500000"), LocalDate.of(2025, 1, 1));

		mockMvc.perform(post("/bill-rates")
					.contentType("application/json")
					.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Don gia am bi reject 400")
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsNegativeDailyRate() throws Exception {
		BillRateCreateReq req = new BillRateCreateReq("Lập trình viên cao cấp", "Cao cấp", new BigDecimal("-1000"), LocalDate.of(2025, 1, 1));

		mockMvc.perform(post("/bill-rates")
					.contentType("application/json")
					.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("Neu service nem BusinessRuleException thi tra ve ma tuong ung")
	@WithMockUser(authorities = "ROLE_VT-07")
	void returnsBusinessRuleError() throws Exception {
		BillRateCreateReq req = new BillRateCreateReq("Lập trình viên cao cấp", "Cao cấp", new BigDecimal("2500000"), LocalDate.of(2025, 1, 1));
		when(billRateService.create(any(BillRateCreateReq.class))).thenThrow(new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Đơn giá đã tồn tại"));

		mockMvc.perform(post("/bill-rates")
					.contentType("application/json")
					.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errorCode").value("DUPLICATE_DATA"));
	}
}
