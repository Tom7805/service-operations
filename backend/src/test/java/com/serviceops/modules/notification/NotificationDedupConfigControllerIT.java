package com.serviceops.modules.notification;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.notification.controller.NotificationDedupConfigController;
import com.serviceops.modules.notification.dto.response.NotificationDedupConfigRes;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationDedupConfigService;
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
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NCL-14-CN-003-TC-03: chi Quan tri vien (VT-07) duoc mo chuc nang cau hinh chong gui trung thong
 * bao; vai tro khac bi tu choi (AccessDeniedAuditRecorder tu ghi log, kiem thu rieng o do).
 */
@WebMvcTest(controllers = NotificationDedupConfigController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class NotificationDedupConfigControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private NotificationDedupConfigService notificationDedupConfigService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("Quan tri vien (VT-07) xem duoc cau hinh chong gui trung")
	@WithMockUser(authorities = "ROLE_VT-07")
	void adminCanReadConfigs() throws Exception {
		when(notificationDedupConfigService.getConfigs()).thenReturn(
				List.of(new NotificationDedupConfigRes(NotificationType.TASK_BUDGET_EXCEEDED, true, null, null, null)));

		mockMvc.perform(get("/notifications/dedup-configs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].eventType").value("TASK_BUDGET_EXCEEDED"))
				.andExpect(jsonPath("$.data[0].dedupEnabled").value(true));
	}

	@Test
	@DisplayName("Quan tri vien (VT-07) sua duoc cau hinh chong gui trung")
	@WithMockUser(authorities = "ROLE_VT-07")
	void adminCanUpdateConfig() throws Exception {
		mockMvc.perform(put("/notifications/dedup-configs/TASK_BUDGET_EXCEEDED")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"dedupEnabled\": false, \"cooldownHours\": 24}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
	}

	@Test
	@DisplayName("TC-03: vai tro khac Quan tri vien bi tu choi truy cap")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesNonAdminRole() throws Exception {
		mockMvc.perform(get("/notifications/dedup-configs"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Chua co token thi tra 401")
	void deniesAnonymousAccess() throws Exception {
		mockMvc.perform(get("/notifications/dedup-configs"))
				.andExpect(status().isUnauthorized());
	}
}
