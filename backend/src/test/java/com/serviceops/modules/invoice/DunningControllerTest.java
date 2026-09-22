package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.invoice.controller.DunningController;
import com.serviceops.modules.invoice.dto.response.DunningLogRes;
import com.serviceops.modules.invoice.dto.response.DunningRunRes;
import com.serviceops.modules.invoice.service.DunningService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
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
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua nhac thu no tu dong (NCL-10-CN-006).
 *
 * <p>Chi Ke toan ({@code VT-05}) duoc goi; vai tro khac bi chan boi {@code @PreAuthorize}
 * va he thong ghi nhat ky lan tu choi truy cap (TC-03).</p>
 */
@WebMvcTest(controllers = DunningController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class DunningControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private DunningService dunningService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCanRunDunning() throws Exception {
		DunningLogRes sent = new DunningLogRes(500L, 9L, "UPCOMING_3_DAYS", LocalDate.of(2026, 9, 24), null,
				new BigDecimal("40000000.00"), List.of(1L, 2L, 3L), LocalDateTime.of(2026, 9, 21, 7, 0));
		when(dunningService.run(any())).thenReturn(new DunningRunRes(LocalDate.of(2026, 9, 21), List.of(sent), 0));

		mockMvc.perform(post("/dunning/run").contentType("application/json").content("{}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.sent", org.hamcrest.Matchers.hasSize(1)))
				.andExpect(jsonPath("$.data.sent[0].stage").value("UPCOMING_3_DAYS"))
				.andExpect(jsonPath("$.data.skippedAlreadySentCount").value(0));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesRunForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post("/dunning/run").contentType("application/json").content("{}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/dunning/run"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCanViewHistory() throws Exception {
		DunningLogRes log = new DunningLogRes(1L, 9L, "DUE_TODAY", LocalDate.of(2026, 9, 21), 0,
				new BigDecimal("1000.00"), List.of(1L), LocalDateTime.of(2026, 9, 21, 7, 0));
		when(dunningService.history(9L)).thenReturn(List.of(log));

		mockMvc.perform(get("/invoices/9/dunning-logs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasSize(1)))
				.andExpect(jsonPath("$.data[0].stage").value("DUE_TODAY"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesHistoryForOtherRoles() throws Exception {
		mockMvc.perform(get("/invoices/9/dunning-logs"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsNotFoundForUnknownInvoice() throws Exception {
		when(dunningService.history(99L)).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay hoa don voi id=99"));

		mockMvc.perform(get("/invoices/99/dunning-logs"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}
}
