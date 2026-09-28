package com.serviceops.modules.identity.employee.controller;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.identity.employee.dto.request.HolidayReq;
import com.serviceops.modules.identity.employee.dto.response.HolidayRes;
import com.serviceops.modules.identity.employee.service.HolidayService;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Tầng HTTP của lịch ngày lễ: chỉ Nhân sự (VT-06) và Quản trị viên (VT-07), vai trò khác bị từ chối và ghi nhật ký. */
@WebMvcTest(controllers = HolidayController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class HolidayControllerTest {

	private static final String VALID_BODY = "{\"name\":\"Quoc khanh\",\"holidayDate\":\"2026-09-02\",\"recurringYearly\":true}";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private HolidayService holidayService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-06")
	void hrCanListHolidays() throws Exception {
		when(holidayService.findAll()).thenReturn(List.of(
				new HolidayRes(1L, "Quoc khanh", LocalDate.of(2026, 9, 2), true)));

		mockMvc.perform(get("/holidays"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].name").value("Quoc khanh"))
				.andExpect(jsonPath("$.data[0].recurringYearly").value(true));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-07")
	void adminCanCreateUpdateAndDelete() throws Exception {
		HolidayRes saved = new HolidayRes(1L, "Quoc khanh", LocalDate.of(2026, 9, 2), true);
		when(holidayService.create(any())).thenReturn(saved);
		when(holidayService.update(eq(1L), any())).thenReturn(saved);

		mockMvc.perform(post("/holidays").contentType("application/json").content(VALID_BODY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.id").value(1));
		mockMvc.perform(put("/holidays/1").contentType("application/json").content(VALID_BODY))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/holidays/1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));

		verify(holidayService).create(new HolidayReq("Quoc khanh", LocalDate.of(2026, 9, 2), true));
		verify(holidayService).delete(1L);
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-06")
	void rejectsBlankNameAndMissingDate() throws Exception {
		mockMvc.perform(post("/holidays").contentType("application/json")
						.content("{\"name\":\"  \",\"holidayDate\":\"2026-09-02\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
		mockMvc.perform(post("/holidays").contentType("application/json").content("{\"name\":\"Quoc khanh\"}"))
				.andExpect(status().isBadRequest());

		verify(holidayService, never()).create(any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void deniesOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post("/holidays").contentType("application/json").content(VALID_BODY))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/holidays"));
		verify(holidayService, never()).create(any());
	}
}
