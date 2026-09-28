package com.serviceops.modules.expense;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.expense.controller.OverheadAllocationController;
import com.serviceops.modules.expense.dto.response.OverheadAllocationLineRes;
import com.serviceops.modules.expense.dto.response.OverheadAllocationRes;
import com.serviceops.modules.expense.service.OverheadAllocationService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua {@code POST /overhead-allocations/run} (NCL-08-CN-005).
 *
 * <p>Chi Ke toan ({@code VT-05}) duoc goi; vai tro khac bi chan boi {@code @PreAuthorize}
 * va he thong ghi nhat ky lan tu choi truy cap (TC-03).</p>
 */
@WebMvcTest(controllers = OverheadAllocationController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class OverheadAllocationControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private OverheadAllocationService overheadAllocationService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantCanRunOverheadAllocation() throws Exception {
		when(overheadAllocationService.run(any())).thenReturn(new OverheadAllocationRes(9L,
				LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30), new BigDecimal("100000000"),
				List.of(new OverheadAllocationLineRes(1L, new BigDecimal("120"), new BigDecimal("60000000")),
						new OverheadAllocationLineRes(2L, new BigDecimal("80"), new BigDecimal("40000000"))),
				LocalDateTime.of(2026, 9, 30, 8, 0)));

		mockMvc.perform(post("/overhead-allocations/run")
						.contentType("application/json")
						.content("{\"year\":2026,\"month\":9,\"totalAmount\":100000000}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.id").value(9))
				.andExpect(jsonPath("$.data.totalAmount").value(100000000))
				.andExpect(jsonPath("$.data.allocations", org.hamcrest.Matchers.hasSize(2)))
				.andExpect(jsonPath("$.data.allocations[0].projectId").value(1))
				.andExpect(jsonPath("$.data.allocations[0].allocatedAmount").value(60000000))
				.andExpect(jsonPath("$.data.allocations[1].projectId").value(2))
				.andExpect(jsonPath("$.data.allocations[1].allocatedAmount").value(40000000));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesRunForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post("/overhead-allocations/run")
						.contentType("application/json")
						.content("{\"year\":2026,\"month\":9,\"totalAmount\":100000000}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/overhead-allocations/run"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsRunWithoutTotalAmount() throws Exception {
		mockMvc.perform(post("/overhead-allocations/run")
						.contentType("application/json")
						.content("{\"year\":2026,\"month\":9}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsRunWithZeroTotalAmount() throws Exception {
		mockMvc.perform(post("/overhead-allocations/run")
						.contentType("application/json")
						.content("{\"year\":2026,\"month\":9,\"totalAmount\":0}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsInvalidStateWhenNoApprovedHoursInPeriod() throws Exception {
		when(overheadAllocationService.run(any())).thenThrow(new BusinessRuleException(ErrorCode.INVALID_STATE,
				"Ky 2026-09 chua co gio cong duoc duyet cho du an nao, khong the phan bo chi phi chung"));

		mockMvc.perform(post("/overhead-allocations/run")
						.contentType("application/json")
						.content("{\"year\":2026,\"month\":9,\"totalAmount\":100000000}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsDuplicateDataWhenPeriodAlreadyAllocated() throws Exception {
		when(overheadAllocationService.run(any())).thenThrow(new BusinessRuleException(ErrorCode.DUPLICATE_DATA,
				"Ky 2026-09 da duoc phan bo chi phi chung tu truoc"));

		mockMvc.perform(post("/overhead-allocations/run")
						.contentType("application/json")
						.content("{\"year\":2026,\"month\":9,\"totalAmount\":100000000}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.errorCode").value("DUPLICATE_DATA"));
	}
}
