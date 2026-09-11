package com.serviceops.modules.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.project.controller.ProjectMilestoneController;
import com.serviceops.modules.project.dto.request.ProjectMilestoneReq;
import com.serviceops.modules.project.dto.response.ProjectMilestoneRes;
import com.serviceops.modules.project.enums.MilestoneProgressStatus;
import com.serviceops.modules.project.service.ProjectMilestoneService;
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
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NCL-05-CN-008 / TC-03: chi Quan ly du an (VT-02) duoc quan ly moc tien do;
 * vai tro khac bi tu choi 403 (AccessDeniedAspect ghi nhat ky lan tu choi).
 */
@WebMvcTest(controllers = ProjectMilestoneController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ProjectMilestoneControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private ProjectMilestoneService projectMilestoneService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("TC-03 + TC-01: Quan ly du an (VT-02) tao moc tien do thanh cong")
	void allowsProjectManagerToCreate() throws Exception {
		ProjectMilestoneReq req = new ProjectMilestoneReq("Ban giao giai doan mot", null,
				LocalDate.of(2026, 10, 1), List.of(11L));
		when(projectMilestoneService.createMilestone(eq(1L), any())).thenReturn(
				new ProjectMilestoneRes(21L, 1L, "Ban giao giai doan mot", null,
						LocalDate.of(2026, 10, 1), null, MilestoneProgressStatus.ON_TRACK, null,
						List.of()));

		mockMvc.perform(post("/projects/1/milestones")
						.with(SecurityMockMvcRequestPostProcessors.user("pm01").roles("VT-02"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.status").value("ON_TRACK"));
	}

	@Test
	@DisplayName("TC-03: vai tro khac (VT-05) bi tu choi xem bang theo doi moc tien do")
	void deniesOtherRolesOnList() throws Exception {
		mockMvc.perform(get("/projects/1/milestones")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-05")))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("TC-03: vai tro khac (VT-05) bi tu choi tao moc tien do")
	void deniesOtherRolesOnCreate() throws Exception {
		ProjectMilestoneReq req = new ProjectMilestoneReq("Ban giao giai doan mot", null,
				LocalDate.of(2026, 10, 1), List.of(11L));

		mockMvc.perform(post("/projects/1/milestones")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-05"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden());
	}
}
