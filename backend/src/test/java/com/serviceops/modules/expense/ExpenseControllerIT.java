package com.serviceops.modules.expense;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.expense.controller.ProjectExpenseController;
import com.serviceops.modules.expense.dto.request.ExpenseCreateReq;
import com.serviceops.modules.expense.dto.response.ExpenseRes;
import com.serviceops.modules.expense.enums.ExpenseStatus;
import com.serviceops.modules.expense.enums.ExpenseType;
import com.serviceops.modules.expense.service.ProjectExpenseService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProjectExpenseController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ExpenseControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private ProjectExpenseService projectExpenseService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private ExpenseCreateReq request() {
		return new ExpenseCreateReq(ExpenseType.TRAVEL, new BigDecimal("2000000"), LocalDate.of(2026, 9, 10),
				"Chi phi di lai gap khach hang", null, null);
	}

	@Test
	void specialistCanCreateExpense() throws Exception {
		when(projectExpenseService.create(eq(1L), any())).thenReturn(new ExpenseRes(30L, 1L, 7L,
				ExpenseType.TRAVEL, new BigDecimal("2000000"), LocalDate.of(2026, 9, 10),
				"Chi phi di lai gap khach hang", null, false, ExpenseStatus.SUBMITTED,
				LocalDateTime.parse("2026-09-10T08:00:00")));

		mockMvc.perform(post("/projects/1/expenses")
					.with(user("dev01").roles("VT-03"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(objectMapper.writeValueAsString(request())))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.id").value(30))
				.andExpect(jsonPath("$.data.status").value("SUBMITTED"))
				.andExpect(jsonPath("$.data.billable").value(false));
	}

	@Test
	void nonSpecialistCannotCreateExpense() throws Exception {
		mockMvc.perform(post("/projects/1/expenses")
					.with(user("pm01").roles("VT-02"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(objectMapper.writeValueAsString(request())))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	void rejectsBlankDescription() throws Exception {
		String body = "{\"type\":\"TRAVEL\",\"amount\":2000000,\"expenseDate\":\"2026-09-10\",\"description\":\"\"}";

		mockMvc.perform(post("/projects/1/expenses")
					.with(user("dev01").roles("VT-03"))
					.contentType(MediaType.APPLICATION_JSON)
					.content(body))
				.andExpect(status().isBadRequest());
	}

	@Test
	void accountantCanApproveExpense() throws Exception {
		when(projectExpenseService.approve(30L)).thenReturn(new ExpenseRes(30L, 1L, 7L,
				ExpenseType.TRAVEL, new BigDecimal("2000000"), LocalDate.of(2026, 9, 10),
				"Chi phi di lai gap khach hang", null, false, ExpenseStatus.APPROVED,
				LocalDateTime.parse("2026-09-10T08:00:00")));

		mockMvc.perform(post("/expenses/30/approve").with(user("accountant").roles("VT-05")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("APPROVED"));
	}

	@Test
	void specialistCannotApproveExpense() throws Exception {
		mockMvc.perform(post("/expenses/30/approve").with(user("dev01").roles("VT-03")))
				.andExpect(status().isForbidden());
	}

	@Test
	void accountantRejectRequiresReason() throws Exception {
		mockMvc.perform(post("/expenses/30/reject").with(user("accountant").roles("VT-05"))
					.contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void accountantCanListPendingExpenses() throws Exception {
		when(projectExpenseService.findPending()).thenReturn(java.util.List.of());

		mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
					.get("/expenses/pending").with(user("accountant").roles("VT-05")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data").isArray());
	}
}
