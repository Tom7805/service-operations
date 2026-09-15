package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.timesheet.controller.TimesheetAdjustmentController;
import com.serviceops.modules.timesheet.dto.response.AdjustmentTraceRes;
import com.serviceops.modules.timesheet.dto.response.TimeEntryRes;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.service.TimesheetAdjustmentService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
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
 * Kiem tra tang HTTP cua {@code POST .../reversal} va {@code GET .../adjustments}
 * (NCL-06-CN-005).
 *
 * <p>Chi Quan ly du an ({@code VT-02}) duoc goi; vai tro khac bi chan boi
 * {@code @PreAuthorize} va he thong ghi nhat ky lan tu choi truy cap.</p>
 */
@WebMvcTest(controllers = TimesheetAdjustmentController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class TimesheetAdjustmentControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private TimesheetAdjustmentService timesheetAdjustmentService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private AdjustmentTraceRes sampleTrace() {
		TimeEntryRes original = new TimeEntryRes(30L, 20L, 7L, LocalDate.of(2026, 9, 7),
				new BigDecimal("8"), TimeEntryStatus.APPROVED, null, true, LocalDateTime.of(2026, 9, 7, 9, 0));
		TimeEntryRes reversal = new TimeEntryRes(31L, 20L, 7L, LocalDate.of(2026, 9, 7),
				new BigDecimal("-8"), TimeEntryStatus.APPROVED, null, true, LocalDateTime.of(2026, 9, 14, 10, 0));
		TimeEntryRes corrected = new TimeEntryRes(32L, 20L, 7L, LocalDate.of(2026, 9, 7),
				new BigDecimal("6"), TimeEntryStatus.APPROVED, null, true, LocalDateTime.of(2026, 9, 14, 10, 0));
		return new AdjustmentTraceRes(5L, original, reversal, corrected, "Ghi nham gio",
				"pm01", LocalDateTime.of(2026, 9, 14, 10, 0));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void allowsProjectManagerToAdjustAndReturnsTrace() throws Exception {
		when(timesheetAdjustmentService.adjust(eq(1L), eq(20L), eq(30L), any()))
				.thenReturn(sampleTrace());

		mockMvc.perform(post("/projects/1/tasks/20/time-entries/30/reversal")
						.contentType("application/json")
						.content("{\"correctedHours\":6,\"reason\":\"Ghi nham gio\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.adjustmentId").value(5))
				.andExpect(jsonPath("$.data.correctedEntry.hours").value(6));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void rejectsAdjustWithoutReasonReturnsValidationError() throws Exception {
		mockMvc.perform(post("/projects/1/tasks/20/time-entries/30/reversal")
						.contentType("application/json")
						.content("{\"correctedHours\":6}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void deniesAdjustForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post("/projects/1/tasks/20/time-entries/30/reversal")
						.contentType("application/json")
						.content("{\"correctedHours\":6,\"reason\":\"Ghi nham gio\"}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/reversal"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void returnsForbiddenWhenAdjustingEntryOfForeignProject() throws Exception {
		when(timesheetAdjustmentService.adjust(eq(1L), eq(20L), eq(30L), any()))
				.thenThrow(new AccessDeniedException("Cong viec khong thuoc du an ban quan ly"));

		mockMvc.perform(post("/projects/1/tasks/20/time-entries/30/reversal")
						.contentType("application/json")
						.content("{\"correctedHours\":6,\"reason\":\"Ghi nham gio\"}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void returnsInvalidStateWhenPeriodIsLocked() throws Exception {
		when(timesheetAdjustmentService.adjust(eq(1L), eq(20L), eq(30L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.INVALID_STATE,
						"Ky cham cong chua dong goc da bi khoa"));

		mockMvc.perform(post("/projects/1/tasks/20/time-entries/30/reversal")
						.contentType("application/json")
						.content("{\"correctedHours\":6,\"reason\":\"Ghi nham gio\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void allowsProjectManagerToViewHistory() throws Exception {
		when(timesheetAdjustmentService.findHistory(1L, 20L)).thenReturn(List.of(sampleTrace()));

		mockMvc.perform(get("/projects/1/tasks/20/adjustments"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].adjustmentId").value(5));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void deniesHistoryForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get("/projects/1/tasks/20/adjustments"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/adjustments"));
	}
}
