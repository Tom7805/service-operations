package com.serviceops.modules.opportunity;

import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.opportunity.controller.SalesPipelineController;
import com.serviceops.modules.opportunity.dto.response.PipelineReportRes;
import com.serviceops.modules.opportunity.dto.response.PipelineStageRes;
import com.serviceops.modules.opportunity.service.SalesPipelineReportService;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua bao cao duong ong ban hang (NCL-03-CN-007):
 * - TC-01: Ban giam doc (VT-01) va Nhan vien kinh doanh (VT-04) xem duoc bao cao.
 * - TC-02: cac o "dong lau bat thuong" duoc tra ve trong response.
 * - TC-03: vai tro khac bi tu choi (403) — lan tu choi duoc aspect ghi nhat ky.
 */
@WebMvcTest(controllers = SalesPipelineController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class SalesPipelineControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private SalesPipelineReportService salesPipelineReportService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	private PipelineReportRes sampleReport() {
		return new PipelineReportRes(3L, new BigDecimal("600000000"), 60, LocalDateTime.now(), List.of(
				new PipelineStageRes("APPROACH", 1L, new BigDecimal("100000000"), 12L, 0L, List.of()),
				new PipelineStageRes("PROPOSAL", 1L, new BigDecimal("200000000"), 40L, 0L, List.of()),
				new PipelineStageRes("NEGOTIATION", 1L, new BigDecimal("300000000"), 75L, 1L, List.of(42L)),
				new PipelineStageRes("WON", 0L, BigDecimal.ZERO, 0L, 0L, List.of()),
				new PipelineStageRes("LOST", 0L, BigDecimal.ZERO, 0L, 0L, List.of())));
	}

	@Test
	@DisplayName("TC-01: Ban giam doc (VT-01) xem duoc bao cao duong ong")
	@WithMockUser(authorities = "ROLE_VT-01")
	void allowsBoardRoleToViewPipelineReport() throws Exception {
		when(salesPipelineReportService.generate()).thenReturn(sampleReport());

		mockMvc.perform(get("/opportunities/pipeline-report"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.totalOpportunityCount").value(3))
				.andExpect(jsonPath("$.data.stalledThresholdDays").value(60))
				.andExpect(jsonPath("$.data.stages.length()").value(5))
				.andExpect(jsonPath("$.data.stages[0].stage").value("APPROACH"))
				.andExpect(jsonPath("$.data.stages[2].stage").value("NEGOTIATION"))
				.andExpect(jsonPath("$.data.stages[2].stalledCount").value(1))
				.andExpect(jsonPath("$.data.stages[2].stalledOpportunityIds[0]").value(42));
	}

	@Test
	@DisplayName("TC-01: Nhan vien kinh doanh (VT-04) cung xem duoc bao cao duong ong")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesRoleToViewPipelineReport() throws Exception {
		when(salesPipelineReportService.generate())
				.thenReturn(new PipelineReportRes(0L, BigDecimal.ZERO, 60, LocalDateTime.now(), List.of()));

		mockMvc.perform(get("/opportunities/pipeline-report"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.totalOpportunityCount").value(0));
	}

	@Test
	@DisplayName("TC-03: vai tro khac Ban giam doc / Nhan vien kinh doanh bi tu choi (403)")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRoles() throws Exception {
		mockMvc.perform(get("/opportunities/pipeline-report"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Chua dang nhap thi bi tu choi (401)")
	void deniesAnonymous() throws Exception {
		mockMvc.perform(get("/opportunities/pipeline-report"))
				.andExpect(status().isUnauthorized());
	}
}
