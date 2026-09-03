package com.serviceops.modules.opportunity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.opportunity.controller.OpportunityController;
import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.request.StageChangeReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.dto.response.StageHistoryRes;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.service.OpportunityService;
import com.serviceops.modules.opportunity.service.OpportunityStageService;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua module co hoi ban hang:
 * - POST /opportunities (NCL-03-CN-001): TC-01 tao thanh cong, TC-02 gia tri du kien khong
 *   hop le, TC-03 tu choi vai tro khong phu hop.
 * - PATCH /opportunities/{id}/stage va GET /opportunities/{id}/stage-history (NCL-03-CN-002):
 *   TC-01/02/03/05.
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
	private OpportunityStageService opportunityStageService;

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
				LocalDate.now().plusMonths(1), "APPROACH", "OPEN", new BigDecimal("10"),
				42L, "sale01", LocalDateTime.now()));

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

	// --- PATCH /opportunities/{id}/stage (NCL-03-CN-002) ---

	@Test
	@DisplayName("TC-01/02: Nhan vien kinh doanh chuyen giai doan thanh cong, xac suat duoc cap nhat")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesRoleToChangeStage() throws Exception {
		when(opportunityStageService.changeStage(any())).thenReturn(new OpportunityRes(
				1L, "Trien khai ERP", 10L, null, new BigDecimal("500000000"), null,
				"PROPOSAL", "OPEN", new BigDecimal("40"), 42L, "sale01", LocalDateTime.now()));

		mockMvc.perform(patch("/opportunities/1/stage")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(new StageChangeReq(null, OpportunityStage.PROPOSAL))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.stage").value("PROPOSAL"))
				.andExpect(jsonPath("$.data.probability").value(40));
	}

	@Test
	@DisplayName("TC-03: vai tro khong phai Nhan vien kinh doanh bi tu choi chuyen giai doan (403)")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesForStageChange() throws Exception {
		mockMvc.perform(patch("/opportunities/1/stage")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(new StageChangeReq(null, OpportunityStage.PROPOSAL))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Thieu targetStage thi bao 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsMissingTargetStage() throws Exception {
		mockMvc.perform(patch("/opportunities/1/stage")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(new StageChangeReq(null, null))))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("TC-02: nhay coc giai doan thi bao 400 INVALID_STATE")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsSkippedStageTransition() throws Exception {
		when(opportunityStageService.changeStage(any())).thenThrow(
				new BusinessRuleException(ErrorCode.INVALID_STATE, "Giai doan khong hop le"));

		mockMvc.perform(patch("/opportunities/1/stage")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(new StageChangeReq(null, OpportunityStage.WON))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@DisplayName("TC-03: co hoi da dong thi bao 400 INVALID_STATE, khong cho mo lai")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsChangingStageOfClosedOpportunity() throws Exception {
		when(opportunityStageService.changeStage(any())).thenThrow(
				new BusinessRuleException(ErrorCode.INVALID_STATE, "Co hoi da dong - khong the mo lai"));

		mockMvc.perform(patch("/opportunities/1/stage")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(new StageChangeReq(null, OpportunityStage.PROPOSAL))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@DisplayName("Khong tim thay co hoi thi bao 404")
	@WithMockUser(authorities = "ROLE_VT-04")
	void returnsNotFoundWhenOpportunityMissing() throws Exception {
		when(opportunityStageService.changeStage(any())).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay co hoi voi id=99"));

		mockMvc.perform(patch("/opportunities/99/stage")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(new StageChangeReq(null, OpportunityStage.PROPOSAL))))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	// --- GET /opportunities/{id}/stage-history (NCL-03-CN-002 TC-05) ---

	@Test
	@DisplayName("TC-05: Nhan vien kinh doanh xem duoc lich su chuyen giai doan")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesRoleToViewStageHistory() throws Exception {
		when(opportunityStageService.history(1L)).thenReturn(List.of(
				new StageHistoryRes(2L, 1L, "APPROACH", "PROPOSAL", "sale01", LocalDateTime.now()),
				new StageHistoryRes(1L, 1L, null, "APPROACH", "sale01", LocalDateTime.now().minusDays(1))));

		mockMvc.perform(get("/opportunities/1/stage-history"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.length()").value(2))
				.andExpect(jsonPath("$.data[0].toStage").value("PROPOSAL"))
				.andExpect(jsonPath("$.data[1].toStage").value("APPROACH"));
	}

	@Test
	@DisplayName("TC-03: vai tro khong phai Nhan vien kinh doanh bi tu choi xem lich su (403)")
	@WithMockUser(authorities = "ROLE_VT-05")
	void deniesOtherRolesForStageHistory() throws Exception {
		mockMvc.perform(get("/opportunities/1/stage-history"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Khong tim thay co hoi thi bao 404")
	@WithMockUser(authorities = "ROLE_VT-04")
	void returnsNotFoundWhenOpportunityMissingForHistory() throws Exception {
		when(opportunityStageService.history(99L)).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay co hoi voi id=99"));

		mockMvc.perform(get("/opportunities/99/stage-history"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}
}
