package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.invoice.controller.RecurringInvoiceController;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceRes;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceRunRes;
import com.serviceops.modules.invoice.dto.response.RecurringInvoiceSkipRes;
import com.serviceops.modules.invoice.dto.response.RecurringScheduleRes;
import com.serviceops.modules.invoice.service.RecurringInvoiceService;
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
 * Kiem tra tang HTTP cua hoa don dinh ky (NCL-10-CN-005).
 *
 * <p>Chi Ke toan ({@code VT-05}) duoc goi; vai tro khac bi chan boi {@code @PreAuthorize}
 * va he thong ghi nhat ky lan tu choi truy cap (TC-03).</p>
 */
@WebMvcTest(controllers = RecurringInvoiceController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class RecurringInvoiceControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private RecurringInvoiceService recurringInvoiceService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCanCreateSchedule() throws Exception {
		when(recurringInvoiceService.createSchedule(eq(1L), any())).thenReturn(
				new RecurringScheduleRes(1L, 1L, 5, new BigDecimal("10000000"), "VND", true, null, null,
						LocalDateTime.of(2026, 9, 1, 8, 0), null));

		mockMvc.perform(post("/contracts/1/recurring-invoice-schedule")
						.contentType("application/json")
						.content("{\"billingDayOfMonth\":5,\"amount\":10000000,\"currency\":\"VND\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.billingDayOfMonth").value(5))
				.andExpect(jsonPath("$.data.amount").value(10000000));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesCreateScheduleForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post("/contracts/1/recurring-invoice-schedule")
						.contentType("application/json")
						.content("{\"billingDayOfMonth\":5,\"amount\":10000000,\"currency\":\"VND\"}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/recurring-invoice-schedule"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsScheduleWithDayOutOfRange() throws Exception {
		mockMvc.perform(post("/contracts/1/recurring-invoice-schedule")
						.contentType("application/json")
						.content("{\"billingDayOfMonth\":31,\"amount\":10000000,\"currency\":\"VND\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsInvalidStateForNonMaintenanceContract() throws Exception {
		when(recurringInvoiceService.createSchedule(eq(2L), any())).thenThrow(new BusinessRuleException(
				ErrorCode.INVALID_STATE,
				"Chi hop dong duy tri (loai MAINTENANCE) moi khai bao duoc dieu khoan lap hoa don dinh ky"));

		mockMvc.perform(post("/contracts/2/recurring-invoice-schedule")
						.contentType("application/json")
						.content("{\"billingDayOfMonth\":5,\"amount\":10000000,\"currency\":\"VND\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCanRunRecurringInvoices() throws Exception {
		RecurringInvoiceRes created = new RecurringInvoiceRes(500L, "HD-202609-0001", 1L, 100L,
				LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30), LocalDate.of(2026, 9, 5),
				new BigDecimal("10000000"), "VND", "DRAFT");
		RecurringInvoiceSkipRes skipped = new RecurringInvoiceSkipRes(2L, "Hợp đồng đã hết hiệu lực");
		when(recurringInvoiceService.run(any())).thenReturn(
				new RecurringInvoiceRunRes(LocalDate.of(2026, 9, 5), List.of(created), List.of(skipped)));

		mockMvc.perform(post("/recurring-invoices/run").contentType("application/json").content("{}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.created", org.hamcrest.Matchers.hasSize(1)))
				.andExpect(jsonPath("$.data.created[0].invoiceNumber").value("HD-202609-0001"))
				.andExpect(jsonPath("$.data.skipped", org.hamcrest.Matchers.hasSize(1)))
				.andExpect(jsonPath("$.data.skipped[0].contractId").value(2));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesRunForOtherRoles() throws Exception {
		mockMvc.perform(post("/recurring-invoices/run").contentType("application/json").content("{}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCanGetSchedule() throws Exception {
		when(recurringInvoiceService.getSchedule(1L)).thenReturn(
				new RecurringScheduleRes(1L, 1L, 5, new BigDecimal("10000000"), "VND", true, "2026-08", null,
						LocalDateTime.of(2026, 8, 1, 8, 0), null));

		mockMvc.perform(get("/contracts/1/recurring-invoice-schedule"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.lastGeneratedPeriod").value("2026-08"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsNotFoundWhenScheduleMissing() throws Exception {
		when(recurringInvoiceService.getSchedule(3L)).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Hop dong chua khai bao dieu khoan"));

		mockMvc.perform(get("/contracts/3/recurring-invoice-schedule"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}
}
