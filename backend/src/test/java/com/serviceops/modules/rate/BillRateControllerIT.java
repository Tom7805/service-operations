package com.serviceops.modules.rate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.rate.controller.BillRateController;
import com.serviceops.modules.rate.dto.request.BillRateCreateReq;
import com.serviceops.modules.rate.dto.response.BillRateHistoryEntryRes;
import com.serviceops.modules.rate.dto.response.BillRateHistoryRes;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

	@Test
	@DisplayName("Ke toan tra dung don gia hieu luc tai ngay gio cong phat sinh (NCL-07-CN-002 TC-02)")
	@WithMockUser(authorities = "ROLE_VT-05")
	void resolvesRateAsOfWorkDate() throws Exception {
		BillRateRes res = new BillRateRes("Lập trình viên cao cấp", "Cao cấp", new BigDecimal("500000"), LocalDate.of(2026, 1, 1));
		when(billRateService.resolve("Lập trình viên cao cấp", "Cao cấp", LocalDate.of(2026, 6, 30))).thenReturn(res);

		mockMvc.perform(get("/bill-rates/resolve")
					.param("professionalRole", "Lập trình viên cao cấp")
					.param("level", "Cao cấp")
					.param("asOf", "2026-06-30"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.dailyRate").value(500000))
				.andExpect(jsonPath("$.data.effectiveFrom").value("2026-01-01"));
	}

	@Test
	@DisplayName("Vai tro khong phai ke toan/quan tri vien bi tu choi tra cuu hieu luc don gia (NCL-07-CN-002 TC-04)")
	@WithMockUser(authorities = "ROLE_VT-04")
	void deniesOtherRolesFromResolve() throws Exception {
		mockMvc.perform(get("/bill-rates/resolve")
					.param("professionalRole", "Lập trình viên cao cấp")
					.param("level", "Cao cấp")
					.param("asOf", "2026-06-30"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Chua co don gia hieu luc tai ngay yeu cau tra ve 404")
	@WithMockUser(authorities = "ROLE_VT-05")
	void resolveReturnsNotFoundWhenNoRateApplies() throws Exception {
		when(billRateService.resolve("Lập trình viên cao cấp", "Cao cấp", LocalDate.of(2020, 1, 1)))
				.thenThrow(new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Chưa có đơn giá hiệu lực"));

		mockMvc.perform(get("/bill-rates/resolve")
					.param("professionalRole", "Lập trình viên cao cấp")
					.param("level", "Cao cấp")
					.param("asOf", "2020-01-01"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	@Test
	@DisplayName("Ke toan xem lich su thay doi don gia thanh cong (NCL-07-CN-007 TC-01)")
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantViewsRateHistory() throws Exception {
		BillRateHistoryRes res = new BillRateHistoryRes("Lập trình viên cao cấp", "Cao cấp", java.util.List.of(
				new BillRateHistoryEntryRes(1L, new BigDecimal("500000"), LocalDate.of(2025, 1, 1),
						LocalDate.of(2025, 12, 31), false, "ke.toan01", java.time.LocalDateTime.of(2025, 1, 1, 9, 0)),
				new BillRateHistoryEntryRes(2L, new BigDecimal("600000"), LocalDate.of(2026, 1, 1),
						null, true, "ke.toan02", java.time.LocalDateTime.of(2025, 12, 20, 14, 0))
		), true);
		when(billRateService.history("Lập trình viên cao cấp", "Cao cấp")).thenReturn(res);

		mockMvc.perform(get("/bill-rates/history")
					.param("professionalRole", "Lập trình viên cao cấp")
					.param("level", "Cao cấp"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.everChanged").value(true))
				.andExpect(jsonPath("$.data.entries.length()").value(2))
				.andExpect(jsonPath("$.data.entries[0].effectiveTo").value("2025-12-31"))
				.andExpect(jsonPath("$.data.entries[0].current").value(false))
				.andExpect(jsonPath("$.data.entries[1].current").value(true))
				.andExpect(jsonPath("$.data.entries[1].changedBy").value("ke.toan02"));
	}

	@Test
	@DisplayName("Chi mot moc don gia thi tra ve everChanged=false (NCL-07-CN-007 TC-02)")
	@WithMockUser(authorities = "ROLE_VT-07")
	void historyReturnsNeverChangedForSingleMilestone() throws Exception {
		BillRateHistoryRes res = new BillRateHistoryRes("Kế toán viên", "Trung cấp", java.util.List.of(
				new BillRateHistoryEntryRes(9L, new BigDecimal("300000"), LocalDate.of(2026, 1, 1),
						null, true, null, null)
		), false);
		when(billRateService.history("Kế toán viên", "Trung cấp")).thenReturn(res);

		mockMvc.perform(get("/bill-rates/history")
					.param("professionalRole", "Kế toán viên")
					.param("level", "Trung cấp"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.everChanged").value(false))
				.andExpect(jsonPath("$.data.entries.length()").value(1));
	}

	@Test
	@DisplayName("Vai tro khong phai ke toan/quan tri vien bi tu choi xem lich su don gia (NCL-07-CN-007 TC-03)")
	@WithMockUser(authorities = "ROLE_VT-04")
	void deniesOtherRolesFromHistory() throws Exception {
		mockMvc.perform(get("/bill-rates/history")
					.param("professionalRole", "Lập trình viên cao cấp")
					.param("level", "Cao cấp"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Vai tro/cap bac chua tung co don gia thi tra ve 404")
	@WithMockUser(authorities = "ROLE_VT-05")
	void historyReturnsNotFoundWhenRoleNeverHadRate() throws Exception {
		when(billRateService.history("Không tồn tại", "Trung cấp"))
				.thenThrow(new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Chưa có đơn giá nào"));

		mockMvc.perform(get("/bill-rates/history")
					.param("professionalRole", "Không tồn tại")
					.param("level", "Trung cấp"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}
}
