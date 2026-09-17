package com.serviceops.modules.expense;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.expense.controller.SubcontractorExpenseController;
import com.serviceops.modules.expense.dto.request.SubcontractorExpenseReq;
import com.serviceops.modules.expense.dto.response.SubcontractorExpenseRes;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.service.SubcontractorExpenseService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** NCL-08-CN-004: kiem thu hop dong API cua chuc nang ghi nhan chi phi thue ngoai. */
@WebMvcTest(controllers = SubcontractorExpenseController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class SubcontractorExpenseControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private SubcontractorExpenseService subcontractorExpenseService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private SubcontractorExpenseReq request() {
		return new SubcontractorExpenseReq("Cong ty TNHH ABC", "Trien khai module bao cao",
				new BigDecimal("50000000"), LocalDate.of(2026, 9, 10));
	}

	@Test
	void projectManagerCanCreateSubcontractorExpense() throws Exception {
		when(subcontractorExpenseService.create(eq(1L), any())).thenReturn(new SubcontractorExpenseRes(40L, 1L, 5L,
				"Cong ty TNHH ABC", "Trien khai module bao cao", new BigDecimal("50000000"),
				LocalDate.of(2026, 9, 10), ExpenseStatus.SUBMITTED, LocalDateTime.parse("2026-09-10T08:00:00")));

		mockMvc.perform(post("/projects/1/subcontractor-expenses")
					.with(user("pm01").roles("VT-02"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(objectMapper.writeValueAsString(request())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.id").value(40))
				.andExpect(jsonPath("$.data.contractorName").value("Cong ty TNHH ABC"))
				.andExpect(jsonPath("$.data.workScope").value("Trien khai module bao cao"))
				.andExpect(jsonPath("$.data.status").value("SUBMITTED"));
	}

	@Test
	void nonProjectManagerCannotCreateSubcontractorExpense() throws Exception {
		mockMvc.perform(post("/projects/1/subcontractor-expenses")
					.with(user("dev01").roles("VT-03"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(objectMapper.writeValueAsString(request())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	void rejectsBlankWorkScope() throws Exception {
		String body = "{\"contractorName\":\"Cong ty TNHH ABC\",\"workScope\":\"\",\"amount\":50000000,"
				+ "\"incurredPeriod\":\"2026-09-10\"}";

		mockMvc.perform(post("/projects/1/subcontractor-expenses")
					.with(user("pm01").roles("VT-02"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(body))
				.andExpect(status().isBadRequest());
	}

	@Test
	void rejectsBlankContractorName() throws Exception {
		String body = "{\"contractorName\":\"\",\"workScope\":\"Trien khai module bao cao\",\"amount\":50000000,"
				+ "\"incurredPeriod\":\"2026-09-10\"}";

		mockMvc.perform(post("/projects/1/subcontractor-expenses")
					.with(user("pm01").roles("VT-02"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(body))
				.andExpect(status().isBadRequest());
	}

	@Test
	void accountantCanListPendingSubcontractorExpenses() throws Exception {
		when(subcontractorExpenseService.findPending()).thenReturn(List.of());

		mockMvc.perform(get("/subcontractor-expenses/pending").with(user("accountant").roles("VT-05")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data").isArray());
	}

	@Test
	void projectManagerCannotListPendingSubcontractorExpenses() throws Exception {
		mockMvc.perform(get("/subcontractor-expenses/pending").with(user("pm01").roles("VT-02")))
				.andExpect(status().isForbidden());
	}

	@Test
	void accountantCanApproveSubcontractorExpense() throws Exception {
		when(subcontractorExpenseService.approve(40L)).thenReturn(new SubcontractorExpenseRes(40L, 1L, 5L,
				"Cong ty TNHH ABC", "Trien khai module bao cao", new BigDecimal("50000000"),
				LocalDate.of(2026, 9, 10), ExpenseStatus.APPROVED, LocalDateTime.parse("2026-09-10T08:00:00")));

		mockMvc.perform(post("/subcontractor-expenses/40/approve").with(user("accountant").roles("VT-05")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("APPROVED"));
	}

	@Test
	void accountantRejectRequiresReason() throws Exception {
		mockMvc.perform(post("/subcontractor-expenses/40/reject").with(user("accountant").roles("VT-05"))
					.contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"\"}"))
				.andExpect(status().isBadRequest());
	}
}
