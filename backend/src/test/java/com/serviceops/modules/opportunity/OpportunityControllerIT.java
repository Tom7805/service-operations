package com.serviceops.modules.opportunity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.opportunity.controller.OpportunityController;
import com.serviceops.modules.opportunity.dto.request.ForecastQueryReq;
import com.serviceops.modules.opportunity.dto.request.OpportunityCloseReq;
import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.request.StageChangeReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.dto.response.RevenueForecastRes;
import com.serviceops.modules.opportunity.dto.response.StageHistoryRes;
import com.serviceops.modules.opportunity.enums.LossReason;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.service.OpportunityService;
import com.serviceops.modules.opportunity.service.OpportunityStageService;
import com.serviceops.modules.opportunity.service.RevenueForecastService;
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
import java.time.YearMonth;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
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
 * - GET /opportunities/revenue-forecast (NCL-03-CN-004): TC-01 tra ve du bao dung cho vai
 *   tro duoc phep (VT-01, VT-04), TC-03 tu choi vai tro khac, khoang ngay loc khong hop le.
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
	private RevenueForecastService revenueForecastService;

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
				42L, "sale01", LocalDateTime.now(), null, null, null, null));

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
				"PROPOSAL", "OPEN", new BigDecimal("40"), 42L, "sale01", LocalDateTime.now(),
				null, null, null, null));

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

	// --- POST /opportunities/{id}/close (NCL-03-CN-005) ---

	@Test
	@DisplayName("TC-01: Nhan vien kinh doanh dong co hoi voi ket qua THUA kem ly do va doi thu")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesRoleToCloseOpportunityAsLost() throws Exception {
		OpportunityCloseReq req = new OpportunityCloseReq(OpportunityStage.LOST, LossReason.PRICE_TOO_HIGH,
				"Gia cao hon doi thu 15%", "Doi thu ABC");
		when(opportunityStageService.closeOpportunity(eq(1L), any())).thenReturn(new OpportunityRes(
				1L, "Trien khai ERP", 10L, null, new BigDecimal("500000000"), null,
				"LOST", "CLOSED", BigDecimal.ZERO, 42L, "sale01", LocalDateTime.now(),
				"PRICE_TOO_HIGH", "Gia cao hon doi thu 15%", "Doi thu ABC", LocalDateTime.now()));

		mockMvc.perform(post("/opportunities/1/close")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.stage").value("LOST"))
				.andExpect(jsonPath("$.data.status").value("CLOSED"))
				.andExpect(jsonPath("$.data.lossReason").value("PRICE_TOO_HIGH"))
				.andExpect(jsonPath("$.data.competitorName").value("Doi thu ABC"));
	}

	@Test
	@DisplayName("TC-01: Nhan vien kinh doanh dong co hoi voi ket qua THANG")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesRoleToCloseOpportunityAsWon() throws Exception {
		OpportunityCloseReq req = new OpportunityCloseReq(OpportunityStage.WON, null, null, null);
		when(opportunityStageService.closeOpportunity(eq(1L), any())).thenReturn(new OpportunityRes(
				1L, "Trien khai ERP", 10L, null, new BigDecimal("500000000"), null,
				"WON", "CLOSED", new BigDecimal("100"), 42L, "sale01", LocalDateTime.now(),
				null, null, null, LocalDateTime.now()));

		mockMvc.perform(post("/opportunities/1/close")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.stage").value("WON"))
				.andExpect(jsonPath("$.data.status").value("CLOSED"));
	}

	@Test
	@DisplayName("TC-03: vai tro khong phai Nhan vien kinh doanh bi tu choi dong co hoi (403)")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesForClose() throws Exception {
		OpportunityCloseReq req = new OpportunityCloseReq(OpportunityStage.LOST, LossReason.PRICE_TOO_HIGH, null, null);

		mockMvc.perform(post("/opportunities/1/close")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Thieu result thi bao 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsMissingResult() throws Exception {
		OpportunityCloseReq req = new OpportunityCloseReq(null, null, null, null);

		mockMvc.perform(post("/opportunities/1/close")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("TC-02: chon ket qua THUA nhung khong nhap ly do thi bao 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsLostResultWithoutReason() throws Exception {
		OpportunityCloseReq req = new OpportunityCloseReq(OpportunityStage.LOST, null, null, null);
		when(opportunityStageService.closeOpportunity(eq(1L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
						"Phai chon ly do khi ghi nhan co hoi thua (LOST)"));

		mockMvc.perform(post("/opportunities/1/close")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("Co hoi chua o giai doan dam phan thi bao 400 INVALID_STATE")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsCloseWhenNotInNegotiation() throws Exception {
		OpportunityCloseReq req = new OpportunityCloseReq(OpportunityStage.WON, null, null, null);
		when(opportunityStageService.closeOpportunity(eq(1L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.INVALID_STATE,
						"Chi duoc ghi nhan ket qua thang/thua khi co hoi dang o giai doan dam phan (NEGOTIATION)"));

		mockMvc.perform(post("/opportunities/1/close")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@DisplayName("Khong tim thay co hoi thi bao 404")
	@WithMockUser(authorities = "ROLE_VT-04")
	void returnsNotFoundWhenClosingMissingOpportunity() throws Exception {
		OpportunityCloseReq req = new OpportunityCloseReq(OpportunityStage.WON, null, null, null);
		when(opportunityStageService.closeOpportunity(eq(99L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay co hoi voi id=99"));

		mockMvc.perform(post("/opportunities/99/close")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	// --- GET /opportunities/revenue-forecast (NCL-03-CN-004) ---

	@Test
	@DisplayName("TC-01: Ban giam doc (VT-01) xem duoc du bao doanh thu")
	@WithMockUser(authorities = "ROLE_VT-01")
	void allowsBoardRoleToViewRevenueForecast() throws Exception {
		RevenueForecastRes res = new RevenueForecastRes(new BigDecimal("180000000"), List.of(
				new RevenueForecastRes.MonthlyRevenueForecast(YearMonth.of(2026, 9), new BigDecimal("180000000"), 2)));
		when(revenueForecastService.forecast(any())).thenReturn(res);

		mockMvc.perform(get("/opportunities/revenue-forecast"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.totalExpectedRevenue").value(180000000))
				.andExpect(jsonPath("$.data.months.length()").value(1))
				.andExpect(jsonPath("$.data.months[0].month").value("2026-09"))
				.andExpect(jsonPath("$.data.months[0].expectedRevenue").value(180000000))
				.andExpect(jsonPath("$.data.months[0].opportunityCount").value(2));
	}

	@Test
	@DisplayName("TC-01: Nhan vien kinh doanh (VT-04) cung xem duoc du bao doanh thu")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesRoleToViewRevenueForecast() throws Exception {
		when(revenueForecastService.forecast(any())).thenReturn(new RevenueForecastRes(BigDecimal.ZERO, List.of()));

		mockMvc.perform(get("/opportunities/revenue-forecast"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.totalExpectedRevenue").value(0))
				.andExpect(jsonPath("$.data.months.length()").value(0));
	}

	@Test
	@DisplayName("TC-03: vai tro khac Ban giam doc/Nhan vien kinh doanh bi tu choi xem du bao doanh thu (403)")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesForRevenueForecast() throws Exception {
		mockMvc.perform(get("/opportunities/revenue-forecast"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Tham so from/to duoc chuyen dung xuong tang service")
	@WithMockUser(authorities = "ROLE_VT-04")
	void passesDateRangeToService() throws Exception {
		when(revenueForecastService.forecast(any())).thenReturn(new RevenueForecastRes(BigDecimal.ZERO, List.of()));

		mockMvc.perform(get("/opportunities/revenue-forecast")
						.param("from", "2026-09-01")
						.param("to", "2026-12-31"))
				.andExpect(status().isOk());

		verify(revenueForecastService).forecast(
				new ForecastQueryReq(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 12, 31)));
	}

	@Test
	@DisplayName("TC-02: from sau to thi bao 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsInvalidDateRange() throws Exception {
		mockMvc.perform(get("/opportunities/revenue-forecast")
						.param("from", "2026-10-01")
						.param("to", "2026-09-01"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}
}
