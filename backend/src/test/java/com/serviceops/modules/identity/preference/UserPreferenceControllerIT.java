package com.serviceops.modules.identity.preference;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.identity.preference.controller.UserPreferenceController;
import com.serviceops.modules.identity.preference.dto.request.UserPreferenceReq;
import com.serviceops.modules.identity.preference.dto.response.UserPreferenceRes;
import com.serviceops.modules.identity.preference.enums.DisplayDensity;
import com.serviceops.modules.identity.preference.enums.ThemeMode;
import com.serviceops.modules.identity.preference.service.UserPreferenceService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Cai dat - Giao dien: moi vai tro da dang nhap doc/luu tuy chon cua chinh minh (userId lay tu phien). */
@WebMvcTest(controllers = UserPreferenceController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class UserPreferenceControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private UserPreferenceService userPreferenceService;

	@MockBean
	private CurrentUserScopeProvider currentUserScopeProvider;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("Nhan vien (VT-03) doc duoc tuy chon cua chinh minh")
	@WithMockUser(authorities = "ROLE_VT-03")
	void readsOwnPreferences() throws Exception {
		when(currentUserScopeProvider.currentUserId()).thenReturn(42L);
		when(userPreferenceService.get(42L))
				.thenReturn(new UserPreferenceRes(ThemeMode.DARK, DisplayDensity.COMPACT, "MY_WORK", true, false));

		mockMvc.perform(get("/me/preferences"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.theme").value("DARK"))
				.andExpect(jsonPath("$.data.density").value("COMPACT"))
				.andExpect(jsonPath("$.data.landingTab").value("MY_WORK"))
				.andExpect(jsonPath("$.data.sidebarCollapsed").value(true));
	}

	@Test
	@DisplayName("Luu tuy chon: ghi cho dung nguoi dung cua phien dang nhap")
	@WithMockUser(authorities = "ROLE_VT-05")
	void savesForCurrentUser() throws Exception {
		when(currentUserScopeProvider.currentUserId()).thenReturn(42L);
		when(userPreferenceService.update(eq(42L), any(UserPreferenceReq.class)))
				.thenReturn(new UserPreferenceRes(ThemeMode.SYSTEM, DisplayDensity.COMFORTABLE, null, false, true));

		mockMvc.perform(put("/me/preferences")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"theme\":\"SYSTEM\",\"density\":\"COMFORTABLE\",\"landingTab\":\"\","
								+ "\"sidebarCollapsed\":false,\"reduceMotion\":true}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.theme").value("SYSTEM"));
		verify(userPreferenceService).update(eq(42L), any(UserPreferenceReq.class));
	}

	@Test
	@DisplayName("Ma man hinh mo dau sai dinh dang bi tu choi 400, khong luu")
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsInvalidLandingTab() throws Exception {
		when(currentUserScopeProvider.currentUserId()).thenReturn(42L);

		mockMvc.perform(put("/me/preferences")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"theme\":\"DARK\",\"density\":\"COMPACT\",\"landingTab\":\"<script>\","
								+ "\"sidebarCollapsed\":false,\"reduceMotion\":false}"))
				.andExpect(status().isBadRequest());
		verify(userPreferenceService, never()).update(any(), any());
	}

	@Test
	@DisplayName("Chua dang nhap thi khong doc duoc")
	void requiresAuthentication() throws Exception {
		mockMvc.perform(get("/me/preferences")).andExpect(status().isUnauthorized());
	}
}
