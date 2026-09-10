package com.serviceops.modules.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.project.controller.ProjectRiskController;
import com.serviceops.modules.project.dto.request.ProjectRiskReq;
import com.serviceops.modules.project.dto.response.ProjectRiskRes;
import com.serviceops.modules.project.enums.RiskLevel;
import com.serviceops.modules.project.enums.RiskStatus;
import com.serviceops.modules.project.service.ProjectRiskService;
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

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NCL-05-CN-009 / TC-03: chi Quan ly du an (VT-02) duoc quan ly rui ro;
 * vai tro khac bi tu choi 403 (AccessDeniedAspect ghi nhat ky lan tu choi).
 */
@WebMvcTest(controllers = ProjectRiskController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ProjectRiskControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private ProjectRiskService projectRiskService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("TC-03 + TC-01: Quan ly du an (VT-02) ghi nhan rui ro thanh cong")
	void allowsProjectManagerToCreate() throws Exception {
		ProjectRiskReq req = new ProjectRiskReq("Nha thau phu cham tien do", RiskLevel.HIGH,
				RiskLevel.MEDIUM, "Chuan bi nha thau du phong", 7L);
		when(projectRiskService.createRisk(eq(1L), any())).thenReturn(
				new ProjectRiskRes(31L, 1L, "Nha thau phu cham tien do", RiskLevel.HIGH, RiskLevel.MEDIUM,
						6, RiskLevel.HIGH, RiskStatus.OPEN, "Chuan bi nha thau du phong", 7L, "Nguyen Van A",
						"pm01", LocalDateTime.parse("2026-09-09T10:00:00"),
						LocalDateTime.parse("2026-09-09T10:00:00")));

		mockMvc.perform(post("/projects/1/risks")
						.with(SecurityMockMvcRequestPostProcessors.user("pm01").roles("VT-02"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.score").value(6))
				.andExpect(jsonPath("$.data.severity").value("HIGH"));
	}

	@Test
	@DisplayName("TC-03: vai tro khac (VT-05) bi tu choi xem bang theo doi rui ro")
	void deniesOtherRolesOnList() throws Exception {
		mockMvc.perform(get("/projects/1/risks")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-05")))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("TC-03: vai tro khac (VT-05) bi tu choi ghi nhan rui ro")
	void deniesOtherRolesOnCreate() throws Exception {
		ProjectRiskReq req = new ProjectRiskReq("Nha thau phu cham tien do", RiskLevel.HIGH,
				RiskLevel.MEDIUM, null, 7L);

		mockMvc.perform(post("/projects/1/risks")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-05"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("Thieu mo ta rui ro -> 400 VALIDATION_ERROR")
	void rejectsMissingDescription() throws Exception {
		String body = "{\"impact\":\"HIGH\",\"likelihood\":\"LOW\",\"watcherId\":7}";

		mockMvc.perform(post("/projects/1/risks")
						.with(SecurityMockMvcRequestPostProcessors.user("pm01").roles("VT-02"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isBadRequest());
	}
}
