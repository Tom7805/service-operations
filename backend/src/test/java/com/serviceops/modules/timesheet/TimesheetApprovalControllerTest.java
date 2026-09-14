package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.timesheet.controller.TimesheetApprovalController;
import com.serviceops.modules.timesheet.dto.response.PendingTimesheetRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetApprovalRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.service.TimesheetApprovalService;
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
 * Kiem tra tang HTTP cua {@code GET /timesheets/pending} va
 * {@code POST /timesheets/{id}/approve} (NCL-06-CN-003).
 *
 * <p>TC-02: PM chi duyet duoc dong thuoc du an minh quan ly — sai du an nhan
 * 403 FORBIDDEN tu service (AccessDeniedException). Vai tro khac VT-02 bi
 * chan boi @PreAuthorize va he thong ghi nhat ky lan tu choi truy cap.</p>
 */
@WebMvcTest(controllers = TimesheetApprovalController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class TimesheetApprovalControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private TimesheetApprovalService timesheetApprovalService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void allowsProjectManagerToViewPendingQueue() throws Exception {
		when(timesheetApprovalService.findPending()).thenReturn(List.of(
				new PendingTimesheetRes(50L, 7L, LocalDate.of(2026, 9, 7), LocalDate.of(2026, 9, 13),
						new BigDecimal("10"), 1, new BigDecimal("5"), LocalDateTime.of(2026, 9, 13, 10, 0))));

		mockMvc.perform(get("/timesheets/pending"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].timesheetId").value(50));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void deniesPendingQueueForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get("/timesheets/pending"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/timesheets/pending"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void allowsProjectManagerToApproveAndReturnsResult() throws Exception {
		TimesheetRes timesheetRes = new TimesheetRes(50L, 7L, LocalDate.of(2026, 9, 7),
				LocalDate.of(2026, 9, 13), TimesheetStatus.APPROVED, new BigDecimal("10"),
				"nv01", LocalDateTime.of(2026, 9, 13, 10, 0));
		when(timesheetApprovalService.approve(eq(50L), any()))
				.thenReturn(new TimesheetApprovalRes(timesheetRes, List.of()));

		mockMvc.perform(post("/timesheets/50/approve"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.timesheet.status").value("APPROVED"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void deniesApprovalForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post("/timesheets/50/approve"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/approve"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void returnsForbiddenWhenApprovingEntryOfForeignProject() throws Exception {
		when(timesheetApprovalService.approve(eq(50L), any()))
				.thenThrow(new AccessDeniedException("Dong gio cong thuoc du an ma ban khong quan ly"));

		mockMvc.perform(post("/timesheets/50/approve"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void returnsNotFoundWhenTimesheetMissing() throws Exception {
		when(timesheetApprovalService.approve(eq(99L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay bang cham cong"));

		mockMvc.perform(post("/timesheets/99/approve"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}
}
