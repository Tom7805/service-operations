package com.serviceops.modules.rate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.rate.controller.WorkTypeRateController;
import com.serviceops.modules.rate.dto.request.WorkTypeRateFactorReq;
import com.serviceops.modules.rate.dto.response.WorkTypeRateFactorRes;
import com.serviceops.modules.rate.service.WorkTypeRateService;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = WorkTypeRateController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class WorkTypeRateControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private WorkTypeRateService workTypeRateService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("Ke toan (VT-05) khai bao he so thanh cong")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToUpsertFactor() throws Exception {
		WorkTypeRateFactorReq req = new WorkTypeRateFactorReq(WorkType.OVERTIME, new BigDecimal("1.50"));
		WorkTypeRateFactorRes res = new WorkTypeRateFactorRes(WorkType.OVERTIME, new BigDecimal("1.50"));
		when(workTypeRateService.upsert(any())).thenReturn(res);

		mockMvc.perform(post("/work-type-rates")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.workType").value("OVERTIME"))
				.andExpect(jsonPath("$.data.factor").value(1.50));
	}

	@Test
	@DisplayName("Vai tro khac Ke toan/Quan tri vien bi tu choi khai bao — 403")
	@WithMockUser(authorities = "ROLE_VT-03")
	void deniesNonAccountantFromUpserting() throws Exception {
		WorkTypeRateFactorReq req = new WorkTypeRateFactorReq(WorkType.OVERTIME, new BigDecimal("1.50"));

		mockMvc.perform(post("/work-type-rates")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Nhan vien chuyen mon (VT-03) xem duoc danh sach he so")
	@WithMockUser(authorities = "ROLE_VT-03")
	void allowsSpecialistToListFactors() throws Exception {
		when(workTypeRateService.listAll()).thenReturn(List.of(
				new WorkTypeRateFactorRes(WorkType.NORMAL, new BigDecimal("1.00")),
				new WorkTypeRateFactorRes(WorkType.OVERTIME, new BigDecimal("1.50"))));

		mockMvc.perform(get("/work-type-rates"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(2));
	}

	@Test
	@DisplayName("Thieu factor -> 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsMissingFactor() throws Exception {
		String body = "{\"workType\":\"OVERTIME\"}";

		mockMvc.perform(post("/work-type-rates")
						.contentType("application/json")
						.content(body))
				.andExpect(status().isBadRequest());
	}
}
