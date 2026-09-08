package com.serviceops.modules.contract;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.contract.controller.ContractAmendmentController;
import com.serviceops.modules.contract.dto.response.AmendmentRes;
import com.serviceops.modules.contract.logging.ContractAccessDeniedAspect;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.service.ContractAmendmentService;
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
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua lap phu luc dieu chinh hop dong (NCL-04-CN-004):
 * TC-01 Ke toan (VT-05) lap phu luc thanh cong, TC-03 tu choi vai tro khac, 401
 * khi chua dang nhap, 404 khi khong tim thay hop dong, 400 khi du lieu khong
 * hop le (TC-02, kiem soat o tang service).
 */
@WebMvcTest(controllers = ContractAmendmentController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class,
		ContractAccessDeniedAspect.class})
class ContractAmendmentControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private ContractAmendmentService contractAmendmentService;

	@MockBean
	private ContractAuditLogger contractAuditLogger;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private AmendmentRes amendmentRes() {
		return new AmendmentRes(1L, 5L, "PL-HD-TEST-01", "Bo sung khoi luong cong viec",
				new BigDecimal("1000000000"), new BigDecimal("1200000000"),
				LocalDate.of(2026, 12, 31), LocalDate.of(2027, 6, 30),
				LocalDate.of(2026, 6, 1), "Phu luc 01", "ke_toan01", LocalDateTime.now());
	}

	@Test
	@DisplayName("TC-01: Ke toan (VT-05) lap phu luc dieu chinh gia tri va thoi han thanh cong")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountingRoleToCreateAmendment() throws Exception {
		when(contractAmendmentService.create(eq(5L), any())).thenReturn(amendmentRes());

		mockMvc.perform(post("/contracts/5/amendments")
				.contentType("application/json")
				.content(objectMapper.writeValueAsString(Map.of(
						"reason", "Bo sung khoi luong cong viec",
						"effectiveDate", "2026-06-01",
						"newTotalValue", 1200000000,
						"newEndDate", "2027-06-30"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.amendmentNo").value("PL-HD-TEST-01"))
				.andExpect(jsonPath("$.data.newTotalValue").value(1200000000))
				.andExpect(jsonPath("$.data.newEndDate").value("2027-06-30"));

		verify(contractAmendmentService).create(eq(5L), any());
	}

	@Test
	@DisplayName("TC-01: Ke toan (VT-05) xem duoc lich su phu luc")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountingRoleToListAmendments() throws Exception {
		when(contractAmendmentService.list(5L)).thenReturn(List.of(amendmentRes()));

		mockMvc.perform(get("/contracts/5/amendments"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].amendmentNo").value("PL-HD-TEST-01"));
	}

	@Test
	@DisplayName("TC-03: vai tro khac Ke toan (VT-05) bi tu choi 403 khi lap phu luc")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesNonAccountingRoles() throws Exception {
		mockMvc.perform(post("/contracts/5/amendments")
				.contentType("application/json")
				.content("{\"reason\":\"Ly do\",\"effectiveDate\":\"2026-06-01\",\"newTotalValue\":100}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Chua dang nhap thi bao 401 khi lap phu luc")
	void requiresAuthentication() throws Exception {
		mockMvc.perform(post("/contracts/5/amendments")
				.contentType("application/json")
				.content("{\"reason\":\"Ly do\",\"effectiveDate\":\"2026-06-01\",\"newTotalValue\":100}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	@DisplayName("Khong tim thay hop dong thi bao 404 RESOURCE_NOT_FOUND")
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsNotFoundWhenContractMissing() throws Exception {
		when(contractAmendmentService.create(eq(99L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=99"));

		mockMvc.perform(post("/contracts/99/amendments")
				.contentType("application/json")
				.content("{\"reason\":\"Ly do\",\"effectiveDate\":\"2026-06-01\",\"newTotalValue\":100}"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	@Test
	@DisplayName("TC-02: thieu ca gia tri moi lan thoi han moi thi bao 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsValidationErrorWhenNoAdjustmentProvided() throws Exception {
		when(contractAmendmentService.create(eq(5L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
						"Phu luc phai dieu chinh it nhat gia tri hoac thoi han hop dong"));

		mockMvc.perform(post("/contracts/5/amendments")
				.contentType("application/json")
				.content("{\"reason\":\"Khong co gi thay doi\",\"effectiveDate\":\"2026-06-01\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("Thieu reason bi tu choi 400 tu tang validate cua request")
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsMissingReasonAtRequestValidation() throws Exception {
		mockMvc.perform(post("/contracts/5/amendments")
				.contentType("application/json")
				.content("{\"effectiveDate\":\"2026-06-01\",\"newTotalValue\":100}"))
				.andExpect(status().isBadRequest());
	}
}
