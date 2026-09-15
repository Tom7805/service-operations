package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.timesheet.controller.TimesheetPeriodController;
import com.serviceops.modules.timesheet.dto.response.TimesheetPeriodRes;
import com.serviceops.modules.timesheet.enums.PeriodStatus;
import com.serviceops.modules.timesheet.service.TimesheetPeriodService;
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

import java.time.LocalDate;
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
 * Kiem tra tang HTTP cua {@code GET /timesheet-periods}, {@code POST .../lock}
 * va {@code POST .../{id}/unlock} (NCL-06-CN-006).
 *
 * <p>Chi Ke toan ({@code VT-05}) duoc goi; vai tro khac bi chan boi
 * {@code @PreAuthorize} va he thong ghi nhat ky lan tu choi truy cap.</p>
 */
@WebMvcTest(controllers = TimesheetPeriodController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class TimesheetPeriodControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private TimesheetPeriodService timesheetPeriodService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToListPeriods() throws Exception {
		when(timesheetPeriodService.findAll()).thenReturn(List.of(
				new TimesheetPeriodRes(3L, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30),
						PeriodStatus.OPEN, null, null)));

		mockMvc.perform(get("/timesheet-periods"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].status").value("OPEN"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void deniesListForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get("/timesheet-periods"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/timesheet-periods"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToLockPeriod() throws Exception {
		when(timesheetPeriodService.lock(any())).thenReturn(
				new TimesheetPeriodRes(3L, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30),
						PeriodStatus.LOCKED, "ketoan01", null));

		mockMvc.perform(post("/timesheet-periods/lock")
						.contentType("application/json")
						.content("{\"year\":2026,\"month\":9}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("LOCKED"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsLockWithoutMonthReturnsValidationError() throws Exception {
		mockMvc.perform(post("/timesheet-periods/lock")
						.contentType("application/json")
						.content("{\"year\":2026}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void deniesLockForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post("/timesheet-periods/lock")
						.contentType("application/json")
						.content("{\"year\":2026,\"month\":9}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/lock"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsInvalidStateWhenPendingTimesheetsExist() throws Exception {
		when(timesheetPeriodService.lock(any())).thenThrow(new BusinessRuleException(
				ErrorCode.INVALID_STATE, "Con bang cham cong PENDING_APPROVAL trong ky nay"));

		mockMvc.perform(post("/timesheet-periods/lock")
						.contentType("application/json")
						.content("{\"year\":2026,\"month\":9}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToUnlockPeriod() throws Exception {
		when(timesheetPeriodService.unlock(3L)).thenReturn(
				new TimesheetPeriodRes(3L, LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30),
						PeriodStatus.OPEN, null, null));

		mockMvc.perform(post("/timesheet-periods/3/unlock"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("OPEN"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void deniesUnlockForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post("/timesheet-periods/3/unlock"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/unlock"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsNotFoundWhenPeriodMissing() throws Exception {
		when(timesheetPeriodService.unlock(99L)).thenThrow(
				new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay ky cham cong"));

		mockMvc.perform(post("/timesheet-periods/99/unlock"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}
}
