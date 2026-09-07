package com.serviceops.modules.contract;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.contract.controller.ContractController;
import com.serviceops.modules.contract.dto.response.ContractRes;
import com.serviceops.modules.contract.logging.ContractAccessDeniedAspect;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.service.ContractService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua khai bao loai hop dong va han muc (NCL-04-CN-002):
 * TC-01 Ke toan (VT-05) khai bao thanh cong, TC-03 tu choi vai tro khac,
 * 401 khi chua dang nhap, 404 khi khong tim thay hop dong.
 */
@WebMvcTest(controllers = ContractController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class,
ContractAccessDeniedAspect.class})
class ContractControllerIT {

@Autowired
private MockMvc mockMvc;

@Autowired
private ObjectMapper objectMapper;

@MockBean
private ContractService contractService;

@MockBean
private ContractAuditLogger contractAuditLogger;

@MockBean
private JwtProvider jwtProvider;

@MockBean
private CustomUserDetailsService customUserDetailsService;

@Test
@DisplayName("TC-01: Ke toan (VT-05) khai bao loai va han muc thanh cong")
@WithMockUser(authorities = "ROLE_VT-05")
void allowsAccountingRoleToUpdateTypeAndLimit() throws Exception {
when(contractService.updateTypeAndLimit(eq(5L), any())).thenReturn(new ContractRes(
5L, "HD-4K7X2Q9", "Hop dong ERP", 1L, 1L, "Cong ty TNHH ABC", 30L,
"TIME_AND_MATERIAL", new BigDecimal("500000000"), new BigDecimal("600000000"),
LocalDate.of(2026, 10, 1), LocalDate.of(2027, 9, 30), "DRAFT",
null, "ke_toan01", LocalDateTime.now()));

mockMvc.perform(patch("/contracts/5/type-limit")
.contentType("application/json")
.content(objectMapper.writeValueAsString(java.util.Map.of(
"contractType", "TIME_AND_MATERIAL",
"limitValue", 600000000))))
.andExpect(status().isOk())
.andExpect(jsonPath("$.data.contractType").value("TIME_AND_MATERIAL"))
.andExpect(jsonPath("$.data.limitValue").value(600000000))
.andExpect(jsonPath("$.data.status").value("DRAFT"));

verify(contractService).updateTypeAndLimit(eq(5L), any());
}

@Test
@DisplayName("TC-03: vai tro khac Ke toan (VT-05) bi tu choi 403 khi khai bao")
@WithMockUser(authorities = "ROLE_VT-04")
void deniesNonAccountingRoles() throws Exception {
mockMvc.perform(patch("/contracts/5/type-limit")
.contentType("application/json")
.content("{\"contractType\":\"FIXED_PRICE\"}"))
.andExpect(status().isForbidden())
.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

// Viec ghi nhat ky DENIED_ACCESS (TC-04) duoc kiem soat boi ContractAccessDeniedAspect va
// duoc unit test rieng o ContractAccessDeniedAspectTest - @WebMvcTest khong bat AOP weaving
// nen khong the verify truc tiep loi goi den contractAuditLogger tu day.
}

@Test
@DisplayName("Chua dang nhap thi bao 401 khi khai bao")
void requiresAuthentication() throws Exception {
mockMvc.perform(patch("/contracts/5/type-limit")
.contentType("application/json")
.content("{\"contractType\":\"FIXED_PRICE\"}"))
.andExpect(status().isUnauthorized());
}

@Test
@DisplayName("Khong tim thay hop dong thi bao 404 RESOURCE_NOT_FOUND")
@WithMockUser(authorities = "ROLE_VT-05")
void returnsNotFoundWhenContractMissing() throws Exception {
when(contractService.updateTypeAndLimit(eq(99L), any())).thenThrow(
new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
"Khong tim thay hop dong voi id=99"));

mockMvc.perform(patch("/contracts/99/type-limit")
.contentType("application/json")
.content("{\"contractType\":\"FIXED_PRICE\"}"))
.andExpect(status().isNotFound())
.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
}
}