package com.serviceops.modules.contract;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.contract.controller.ContractExpiryReminderController;
import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;
import com.serviceops.modules.contract.logging.ContractAccessDeniedAspect;
import com.serviceops.modules.contract.logging.ContractAuditLogger;
import com.serviceops.modules.contract.service.ContractExpiryReminderService;
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

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua nhac hop dong sap het hieu luc (NCL-04-CN-006):
 * TC-01 Ke toan (VT-05) kich hoat ra soat thanh cong, TC-02 xem duoc danh
 * sach hop dong qua han van ACTIVE, TC-03 tu choi vai tro khac, 401 khi chua
 * dang nhap.
 */
@WebMvcTest(controllers = ContractExpiryReminderController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class,
		ContractAccessDeniedAspect.class})
class ContractExpiryReminderControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private ContractExpiryReminderService contractExpiryReminderService;

	@MockBean
	private ContractAuditLogger contractAuditLogger;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private ContractExpiryAlertRes alert(String alertType, long daysRemaining) {
		return new ContractExpiryAlertRes(5L, "HD-TEST", "Hop dong ERP", 1L,
				LocalDate.now().plusDays(daysRemaining), daysRemaining, "ACTIVE", "sale01", alertType);
	}

	@Test
	@DisplayName("TC-01: Ke toan (VT-05) kich hoat ra soat va nhan danh sach da gui nhac")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountingToRunReminderScan() throws Exception {
		when(contractExpiryReminderService.runReminderScan()).thenReturn(List.of(alert("EXPIRING_SOON", 25)));

		mockMvc.perform(post("/contracts/expiry-reminders/run"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.length()").value(1))
				.andExpect(jsonPath("$.data[0].alertType").value("EXPIRING_SOON"))
				.andExpect(jsonPath("$.data[0].daysRemaining").value(25));

		verify(contractExpiryReminderService).runReminderScan();
	}

	@Test
	@DisplayName("TC-02: Ke toan (VT-05) xem duoc danh sach hop dong da het hieu luc nhung van ACTIVE")
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountingToListOverdueContracts() throws Exception {
		when(contractExpiryReminderService.listOverdueActiveContracts())
				.thenReturn(List.of(alert("OVERDUE_ACTIVE", -15)));

		mockMvc.perform(get("/contracts/expiry-reminders/overdue"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].alertType").value("OVERDUE_ACTIVE"))
				.andExpect(jsonPath("$.data[0].daysRemaining").value(-15));
	}

	@Test
	@DisplayName("TC-03: vai tro khac Ke toan (VT-05) bi tu choi 403 khi kich hoat ra soat")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesNonAccountingRoles() throws Exception {
		mockMvc.perform(post("/contracts/expiry-reminders/run"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Chua dang nhap thi bao 401")
	void requiresAuthentication() throws Exception {
		mockMvc.perform(get("/contracts/expiry-reminders/overdue"))
				.andExpect(status().isUnauthorized());
	}
}
