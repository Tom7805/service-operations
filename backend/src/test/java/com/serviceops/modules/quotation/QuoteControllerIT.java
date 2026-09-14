package com.serviceops.modules.quotation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.quotation.controller.QuoteController;
import com.serviceops.modules.quotation.dto.request.QuoteCreateReq;
import com.serviceops.modules.quotation.dto.request.QuoteItemReq;
import com.serviceops.modules.quotation.dto.response.QuoteItemRes;
import com.serviceops.modules.quotation.dto.response.QuoteRes;
import com.serviceops.modules.quotation.service.QuoteService;
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
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua POST /opportunities/{opportunityId}/quotes (NCL-03-CN-003):
 * lap bao gia thanh cong, tu choi vai tro khong phu hop, validate du lieu dau vao,
 * khong tim thay co hoi va co hoi chua o giai doan PROPOSAL.
 */
@WebMvcTest(controllers = QuoteController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class QuoteControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private QuoteService quoteService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("Nhan vien kinh doanh (VT-04) lap bao gia thanh cong")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesRoleToCreateQuote() throws Exception {
		QuoteCreateReq req = new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", new BigDecimal("20"))));
		QuoteRes res = new QuoteRes(1L, 12L, 1, new BigDecimal("100000000"),
				List.of(new QuoteItemRes("Lap trinh vien", new BigDecimal("20"), new BigDecimal("5000000"),
						new BigDecimal("100000000"), true)),
				List.of(), "sale01", LocalDateTime.now());
		when(quoteService.create(eq(12L), any())).thenReturn(res);

		mockMvc.perform(post("/opportunities/12/quotes")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.version").value(1))
				.andExpect(jsonPath("$.data.totalAmount").value(100000000))
				.andExpect(jsonPath("$.data.missingRates.length()").value(0));
	}

	@Test
	@DisplayName("Vai tro khong phai Nhan vien kinh doanh bi tu choi lap bao gia (403)")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRoles() throws Exception {
		QuoteCreateReq req = new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", new BigDecimal("20"))));

		mockMvc.perform(post("/opportunities/12/quotes")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Danh sach dong bao gia rong thi bao 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsEmptyItems() throws Exception {
		QuoteCreateReq req = new QuoteCreateReq(List.of());

		mockMvc.perform(post("/opportunities/12/quotes")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("Vai tro chuyen mon de trong thi bao 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsBlankProfessionalRole() throws Exception {
		QuoteCreateReq req = new QuoteCreateReq(List.of(new QuoteItemReq(" ", new BigDecimal("20"))));

		mockMvc.perform(post("/opportunities/12/quotes")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("So ngay cong khong duong thi bao 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsNonPositiveWorkDays() throws Exception {
		QuoteCreateReq req = new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", BigDecimal.ZERO)));

		mockMvc.perform(post("/opportunities/12/quotes")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("Khong tim thay co hoi thi bao 404")
	@WithMockUser(authorities = "ROLE_VT-04")
	void returnsNotFoundWhenOpportunityMissing() throws Exception {
		QuoteCreateReq req = new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", new BigDecimal("20"))));
		when(quoteService.create(eq(99L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay co hoi voi id=99"));

		mockMvc.perform(post("/opportunities/99/quotes")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	@Test
	@DisplayName("Co hoi chua o giai doan PROPOSAL thi bao 400 INVALID_STATE")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsOpportunityOutsideProposalStage() throws Exception {
		QuoteCreateReq req = new QuoteCreateReq(List.of(new QuoteItemReq("Lap trinh vien", new BigDecimal("20"))));
		when(quoteService.create(eq(12L), any())).thenThrow(new BusinessRuleException(ErrorCode.INVALID_STATE,
				"Chi co hoi o giai doan PROPOSAL moi duoc lap bao gia"));

		mockMvc.perform(post("/opportunities/12/quotes")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}
}
