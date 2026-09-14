package com.serviceops.modules.project;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.project.controller.ProjectTemplateController;
import com.serviceops.modules.project.dto.request.ProjectCreateFromTemplateReq;
import com.serviceops.modules.project.dto.response.ProjectRes;
import com.serviceops.modules.project.service.ProjectTemplateService;
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
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NCL-05-CN-007 / TC-03: chi Quan ly du an (VT-02) duoc tao du an tu mau;
 * vai tro khac bi tu choi 403 (AccessDeniedAspect ghi nhat ky lan tu choi).
 */
@WebMvcTest(controllers = ProjectTemplateController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ProjectTemplateControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private ProjectTemplateService projectTemplateService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("TC-03: Quan ly du an (VT-02) tao du an tu mau thanh cong")
	void allowsProjectManager() throws Exception {
		ProjectCreateFromTemplateReq req = new ProjectCreateFromTemplateReq(5L, "Du an ERP",
				LocalDate.of(2027, 1, 1), LocalDate.of(2027, 12, 31), 7L);
		when(projectTemplateService.createProjectFromTemplate(eq(1L), any())).thenReturn(
				new ProjectRes(20L, "DA-001", "Du an ERP", 1L, 9L, "FIXED_PRICE", new BigDecimal("600000000"),
						LocalDate.of(2027, 1, 1), LocalDate.of(2027, 12, 31), 7L, "RUNNING", "pm01", null));

		mockMvc.perform(post("/contracts/1/projects/from-template")
						.with(SecurityMockMvcRequestPostProcessors.user("pm01").roles("VT-02"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.projectCode").value("DA-001"));
	}

	@Test
	@DisplayName("TC-03: vai tro khong phai Quan ly du an (VT-05) bi tu choi tao du an tu mau")
	void deniesOtherRolesOnCreate() throws Exception {
		ProjectCreateFromTemplateReq req = new ProjectCreateFromTemplateReq(5L, "Du an ERP",
				LocalDate.of(2027, 1, 1), LocalDate.of(2027, 12, 31), 7L);

		mockMvc.perform(post("/contracts/1/projects/from-template")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-05"))
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("TC-03: vai tro khac bi tu choi xem danh sach mau du an")
	void deniesOtherRolesOnList() throws Exception {
		mockMvc.perform(get("/contracts/1/projects/from-template")
						.with(SecurityMockMvcRequestPostProcessors.user("nv01").roles("VT-05")))
				.andExpect(status().isForbidden());
	}
}
