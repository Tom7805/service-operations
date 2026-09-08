package com.serviceops.modules.contract;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.contract.controller.ContractMilestoneController;
import com.serviceops.modules.contract.dto.response.MilestoneRes;
import com.serviceops.modules.contract.enums.MilestoneStatus;
import com.serviceops.modules.contract.logging.ContractAccessDeniedAspect;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.service.ContractMilestoneService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua quan ly moc thanh toan hop dong (NCL-04-CN-003):
 * TC-01 Ke toan (VT-05) khai bao thanh cong, TC-03 tu choi vai tro khac, 401
 * khi chua dang nhap, 404 khi khong tim thay hop dong, 400 khi du lieu khong
 * hop le (TC-02, kiem soat o tang service).
 */
@WebMvcTest(controllers = ContractMilestoneController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class,
		ContractAccessDeniedAspect.class})
class ContractMilestoneControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private ContractMilestoneService contractMilestoneService;

	@MockBean
	private ContractAuditLogger contractAuditLogger;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private List<MilestoneRes> threeMilestones() {
		return List.of(
				new MilestoneRes(1L, 5L, "Tam ung", new BigDecimal("30"), new BigDecimal("300000000"),
						LocalDate.of(2026, 10, 15), "Ky hop dong", MilestoneStatus.PLANNED.name(), 0, LocalDateTime.now()),
				new MilestoneRes(2L, 5L, "Nghiem thu giai doan 1", new BigDecimal("30"), new BigDecimal("300000000"),
						LocalDate.of(2027, 1, 15), "Ban giao module loi", MilestoneStatus.PLANNED.name(), 1, LocalDateTime.now()),
				new MilestoneRes(3L, 5L, "Nghiem thu cuoi cung", new BigDecimal("40"), new BigDecimal("400000000"),
						LocalDate.of(2027, 6, 30), "Nghiem thu toan bo he thong", MilestoneStatus.PLANNED.name(), 2, LocalDateTime.now()));
	}

	@Test
	@DisplayName("TC-01: Ke toan (VT-05) khai bao ba moc 30/30/40% thanh cong")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountingRoleToReplaceMilestones() throws Exception {
		when(contractMilestoneService.replaceMilestones(eq(5L), any())).thenReturn(threeMilestones());

		mockMvc.perform(post("/contracts/5/milestones")
				.contentType("application/json")
				.content(objectMapper.writeValueAsString(java.util.Map.of(
						"milestones", List.of(
								java.util.Map.of("name", "Tam ung", "percentage", 30),
								java.util.Map.of("name", "Nghiem thu giai doan 1", "percentage", 30),
								java.util.Map.of("name", "Nghiem thu cuoi cung", "percentage", 40))))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(3))
				.andExpect(jsonPath("$.data[0].amount").value(300000000))
				.andExpect(jsonPath("$.data[2].amount").value(400000000))
				.andExpect(jsonPath("$.data[0].status").value("PLANNED"));

		verify(contractMilestoneService).replaceMilestones(eq(5L), any());
	}

	@Test
	@DisplayName("TC-01: Ke toan (VT-05) xem duoc danh sach moc hien tai")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountingRoleToListMilestones() throws Exception {
		when(contractMilestoneService.list(5L)).thenReturn(threeMilestones());

		mockMvc.perform(get("/contracts/5/milestones"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(3));
	}

	@Test
	@DisplayName("TC-03: vai tro khac Ke toan (VT-05) bi tu choi 403 khi khai bao moc thanh toan")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesNonAccountingRoles() throws Exception {
		mockMvc.perform(post("/contracts/5/milestones")
				.contentType("application/json")
				.content("{\"milestones\":[{\"name\":\"Tam ung\",\"amount\":100}]}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		// Viec ghi nhat ky DENIED_ACCESS (TC-04) duoc kiem soat boi ContractAccessDeniedAspect va
		// duoc unit test rieng o ContractAccessDeniedAspectTest - @WebMvcTest khong bat AOP weaving
		// nen khong the verify truc tiep loi goi den contractAuditLogger tu day (giong ContractControllerIT).
	}

	@Test
	@DisplayName("Chua dang nhap thi bao 401 khi khai bao moc thanh toan")
	void requiresAuthentication() throws Exception {
		mockMvc.perform(post("/contracts/5/milestones")
				.contentType("application/json")
				.content("{\"milestones\":[{\"name\":\"Tam ung\",\"amount\":100}]}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	@DisplayName("Khong tim thay hop dong thi bao 404 RESOURCE_NOT_FOUND")
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsNotFoundWhenContractMissing() throws Exception {
		when(contractMilestoneService.replaceMilestones(eq(99L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=99"));

		mockMvc.perform(post("/contracts/99/milestones")
				.contentType("application/json")
				.content("{\"milestones\":[{\"name\":\"Tam ung\",\"amount\":100}]}"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	@Test
	@DisplayName("TC-02: tong cac moc vuot gia tri hop dong thi bao 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsValidationErrorWhenTotalExceedsContractValue() throws Exception {
		when(contractMilestoneService.replaceMilestones(eq(5L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
						"Tong cac moc thanh toan (1500000000) phai dung bang gia tri hop dong (1000000000)"));

		mockMvc.perform(post("/contracts/5/milestones")
				.contentType("application/json")
				.content("{\"milestones\":[{\"name\":\"Vuot muc\",\"amount\":1500000000}]}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("Danh sach moc rong bi tu choi 400 tu tang validate cua request")
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsEmptyMilestoneListAtRequestValidation() throws Exception {
		mockMvc.perform(post("/contracts/5/milestones")
				.contentType("application/json")
				.content("{\"milestones\":[]}"))
				.andExpect(status().isBadRequest());
	}
}
