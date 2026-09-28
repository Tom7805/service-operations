package com.serviceops.modules.timesheet;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.timesheet.controller.TimesheetReminderController;
import com.serviceops.modules.timesheet.service.TimesheetReminderService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua {@code GET /timesheets/unsubmitted} va
 * {@code POST /timesheets/unsubmitted/remind} (NCL-06-CN-009).
 */
@WebMvcTest(controllers = TimesheetReminderController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class TimesheetReminderControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private TimesheetReminderService timesheetReminderService;

	@MockBean
	private UserRepository userRepository;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void returnsUnsubmittedListWithResolvedNames() throws Exception {
		when(timesheetReminderService.findUnsubmittedUserIds(any(), any())).thenReturn(List.of(7L));
		User user = new User();
		user.setId(7L);
		user.setFullName("Nguyen Van A");
		when(userRepository.findAllById(List.of(7L))).thenReturn(List.of(user));

		mockMvc.perform(get("/timesheets/unsubmitted").param("weekStartDate", "2026-09-07"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].userId").value(7))
				.andExpect(jsonPath("$.data[0].userName").value("Nguyen Van A"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void deniesUnsubmittedListForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get("/timesheets/unsubmitted").param("weekStartDate", "2026-09-07"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), org.mockito.ArgumentMatchers.contains("/timesheets/unsubmitted"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void remindNowCallsServiceAndReturnsRemindedCount() throws Exception {
		when(timesheetReminderService.sendReminders(any(), any())).thenReturn(3);

		mockMvc.perform(post("/timesheets/unsubmitted/remind").param("weekStartDate", "2026-09-07"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data").value(3));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void deniesRemindNowForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post("/timesheets/unsubmitted/remind").param("weekStartDate", "2026-09-07"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), org.mockito.ArgumentMatchers.contains("/remind"));
	}
}
