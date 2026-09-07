package com.serviceops.modules.contract;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.contract.controller.ContractLimitController;
import com.serviceops.modules.contract.dto.response.ContractUsageRes;
import com.serviceops.modules.contract.logging.ContractAccessDeniedAspect;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.service.ContractLimitService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua canh bao khi sap vuot han muc hop dong (NCL-04-CN-005):
 * TC-01 Quan ly du an (VT-02) va Ke toan (VT-05) ghi nhan/xem thanh cong,
 * TC-02 hoa don lam vuot han muc bi tu choi 400, TC-03 tu choi vai tro khac,
 * 401 khi chua dang nhap, 404 khi khong tim thay hop dong.
 */
@WebMvcTest(controllers = ContractLimitController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class,
		ContractAccessDeniedAspect.class})
class ContractLimitControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private ContractLimitService contractLimitService;

	@MockBean
	private ContractAuditLogger contractAuditLogger;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private ContractUsageRes usageRes(BigDecimal usedValue, boolean nearingLimit, boolean overLimit) {
		return new ContractUsageRes(5L, new BigDecimal("1000000000"), new BigDecimal("1000000000"),
				usedValue, new BigDecimal("1000000000").subtract(usedValue),
				usedValue.multiply(new BigDecimal("100")).divide(new BigDecimal("1000000000")),
				nearingLimit, overLimit);
	}

	@Test
	@DisplayName("TC-01: Quan ly du an (VT-02) xem duoc tinh trang han muc")
	@WithMockUser(authorities = "ROLE_VT-02")
	void allowsProjectManagerToGetUsage() throws Exception {
		when(contractLimitService.getUsage(5L)).thenReturn(usageRes(new BigDecimal("300000000"), false, false));

		mockMvc.perform(get("/contracts/5/usage"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.usedValue").value(300000000))
				.andExpect(jsonPath("$.data.nearingLimit").value(false));
	}

	@Test
	@DisplayName("TC-01: Ke toan (VT-05) ghi nhan gio cong da duyet thanh cong va nhan canh bao sap vuot han muc")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountingToRecordUsageAndWarnsNearingLimit() throws Exception {
		when(contractLimitService.recordUsage(eq(5L), any()))
				.thenReturn(usageRes(new BigDecimal("850000000"), true, false));

		mockMvc.perform(post("/contracts/5/usage")
				.contentType("application/json")
				.content(objectMapper.writeValueAsString(
						java.util.Map.of("amount", 50000000, "source", "TIMESHEET_APPROVAL"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.usedValue").value(850000000))
				.andExpect(jsonPath("$.data.nearingLimit").value(true));

		verify(contractLimitService).recordUsage(eq(5L), any());
	}

	@Test
	@DisplayName("TC-02 (QTN-19): hoa don lam vuot han muc thi bao 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsValidationErrorWhenInvoiceExceedsLimit() throws Exception {
		when(contractLimitService.recordUsage(eq(5L), any())).thenThrow(
				new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
						"Ghi nhan hoa don se lam vuot han muc tran cua hop dong"));

		mockMvc.perform(post("/contracts/5/usage")
				.contentType("application/json")
				.content("{\"amount\":100000000,\"source\":\"INVOICE\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("TC-03: vai tro khac Quan ly du an/Ke toan bi tu choi 403")
	@WithMockUser(authorities = "ROLE_VT-04")
	void deniesOtherRoles() throws Exception {
		mockMvc.perform(get("/contracts/5/usage"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Chua dang nhap thi bao 401")
	void requiresAuthentication() throws Exception {
		mockMvc.perform(get("/contracts/5/usage"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	@DisplayName("Khong tim thay hop dong thi bao 404 RESOURCE_NOT_FOUND")
	@WithMockUser(authorities = "ROLE_VT-02")
	void returnsNotFoundWhenContractMissing() throws Exception {
		when(contractLimitService.getUsage(99L)).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hop dong voi id=99"));

		mockMvc.perform(get("/contracts/99/usage"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	@Test
	@DisplayName("Thieu source bi tu choi 400 tu tang validate cua request")
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsMissingSourceAtRequestValidation() throws Exception {
		mockMvc.perform(post("/contracts/5/usage")
				.contentType("application/json")
				.content("{\"amount\":100000000}"))
				.andExpect(status().isBadRequest());
	}
}
