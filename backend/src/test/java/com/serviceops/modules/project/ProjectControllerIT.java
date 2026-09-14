package com.serviceops.modules.project;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.project.controller.ProjectController;
import com.serviceops.modules.project.controller.ProjectReadController;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.service.ProjectService;
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
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Endpoint doc du an ({@code GET /projects/{id}}, {@code GET /contracts/{id}/projects}) —
 * cho phep VT-01/VT-02/VT-03, chan token thieu.
 */
@WebMvcTest(controllers = {ProjectController.class, ProjectReadController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ProjectControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private ProjectService projectService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private ProjectRes sample() {
		return new ProjectRes(20L, "DA-1", "Du an ERP", 5L, 1L, "FIXED_PRICE", new BigDecimal("600000000"),
				LocalDate.of(2027, 1, 1), LocalDate.of(2027, 12, 31), 7L, "RUNNING", "pm01",
				LocalDateTime.parse("2026-09-09T10:00:00"));
	}

	@Test
	@DisplayName("Nhan vien chuyen mon (VT-03) doc duoc chi tiet du an")
	void specialistCanReadProject() throws Exception {
		when(projectService.getProject(eq(20L))).thenReturn(sample());

		mockMvc.perform(get("/projects/20")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-03")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.status").value("RUNNING"));
	}

	@Test
	@DisplayName("Quan ly du an (VT-02) liet ke du an cua hop dong")
	void pmCanListContractProjects() throws Exception {
		when(projectService.listByContract(eq(5L))).thenReturn(List.of(sample()));

		mockMvc.perform(get("/contracts/5/projects")
						.with(SecurityMockMvcRequestPostProcessors.user("pm01").roles("VT-02")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].id").value(20));
	}

	@Test
	@DisplayName("Khong co token -> 401")
	void anonymousRejected() throws Exception {
		mockMvc.perform(get("/projects/20")).andExpect(status().isUnauthorized());
	}
}
