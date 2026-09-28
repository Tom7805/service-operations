package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.timesheet.controller.TimesheetController;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.service.TimesheetSubmitService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua {@code POST /me/timesheets/{weekStartDate}/submit} (NCL-06-CN-002).
 *
 * <p>TC-04: chi Nhan vien chuyen mon ({@code VT-03}) duoc goi; vai tro khac bi tu choi va
 * he thong ghi nhat ky lan tu choi truy cap (qua {@link AccessDeniedAuditRecorder}, muc
 * "Nop bang cham cong theo tuan" dang ky trong feature map).</p>
 */
@WebMvcTest(controllers = TimesheetController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class TimesheetControllerIT {

	private static final String URL = "/me/timesheets/2026-09-07/submit";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private TimesheetSubmitService timesheetSubmitService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void allowsSpecialistRoleAndReturnsSubmittedTimesheet() throws Exception {
		TimesheetRes response = new TimesheetRes(50L, 7L, LocalDate.of(2026, 9, 7),
				LocalDate.of(2026, 9, 13), TimesheetStatus.PENDING_APPROVAL, new BigDecimal("8"),
				"nv01", LocalDateTime.of(2026, 9, 13, 10, 0));
		when(timesheetSubmitService.submit(LocalDate.of(2026, 9, 7), LocalDate.of(2026, 9, 13)))
				.thenReturn(response);

		mockMvc.perform(post(URL))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.id").value(50))
				.andExpect(jsonPath("$.data.status").value("PENDING_APPROVAL"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post(URL))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/timesheets"));
	}

	@Test
	void deniesRequestWithoutAuthentication() throws Exception {
		mockMvc.perform(post(URL))
				.andExpect(status().isUnauthorized());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-03")
	void returnsBadRequestWhenSubmissionViolatesBusinessRule() throws Exception {
		when(timesheetSubmitService.submit(any(), any())).thenThrow(
				new BusinessRuleException(ErrorCode.INVALID_STATE,
						"Khong con dong gio cong nhap (DRAFT) nao trong tuan de nop"));

		mockMvc.perform(post(URL))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}
}
