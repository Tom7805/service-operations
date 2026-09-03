package com.serviceops.modules.opportunity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.opportunity.controller.OpportunityController;
import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.service.OpportunityService;
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
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP: POST /opportunities (NCL-03-CN-001).
 * TC-01 tao thanh cong, TC-02 gia tri du kien khong hop le, TC-03 tu choi vai tro khong phu hop.
 */
@WebMvcTest(controllers = OpportunityController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class OpportunityControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private OpportunityService opportunityService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("TC-01: Nhan vien kinh doanh (VT-04) tao co hoi thanh cong")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesRoleToCreateOpportunity() throws Exception {
		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 10L,
				new BigDecimal("500000000"), LocalDate.now().plusMonths(1), null);
		when(opportunityService.create(any())).thenReturn(new OpportunityRes(
				1L, "Trien khai ERP", 10L, "Cong ty TNHH ABC", new BigDecimal("500000000"),
				LocalDate.now().plusMonths(1), "APPROACH", "OPEN", 42L, "sale01", LocalDateTime.now()));

		mockMvc.perform(post("/opportunities")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.stage").value("APPROACH"))
				.andExpect(jsonPath("$.data.customerName").value("Cong ty TNHH ABC"));
	}

	@Test
	@DisplayName("TC-03: vai tro khong phai Nhan vien kinh doanh bi tu choi (403)")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRoles() throws Exception {
		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 10L,
				new BigDecimal("500000000"), null, null);

		mockMvc.perform(post("/opportunities")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Ten co hoi de trong thi bao 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsBlankName() throws Exception {
		OpportunityCreateReq req = new OpportunityCreateReq("", 10L, new BigDecimal("500000000"), null, null);

		mockMvc.perform(post("/opportunities")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("TC-02: gia tri du kien am thi bao 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsNegativeExpectedValue() throws Exception {
		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", 10L, new BigDecimal("-1"), null, null);

		mockMvc.perform(post("/opportunities")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("Thieu khach hang thi bao 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsMissingCustomerId() throws Exception {
		OpportunityCreateReq req = new OpportunityCreateReq("Trien khai ERP", null, new BigDecimal("500000000"), null, null);

		mockMvc.perform(post("/opportunities")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest());
	}
}
