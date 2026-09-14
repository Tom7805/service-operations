package com.serviceops.modules.opportunity;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.opportunity.controller.OpportunityActivityController;
import com.serviceops.modules.opportunity.dto.request.ActivityCreateReq;
import com.serviceops.modules.opportunity.dto.response.ActivityRes;
import com.serviceops.modules.opportunity.enums.ActivityType;
import com.serviceops.modules.opportunity.service.OpportunityActivityService;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua chuc nang ghi nhan hoat dong cham soc co hoi
 * (NCL-03-CN-006): TC-01 them hoat dong thanh cong, TC-02 co hoi da dong bi
 * tu choi khi them moi, TC-03 tu choi vai tro khong phai Nhan vien kinh doanh.
 */
@WebMvcTest(controllers = OpportunityActivityController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class OpportunityActivityControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private OpportunityActivityService opportunityActivityService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("NCL-03-CN-006 TC-01: Nhan vien kinh doanh them hoat dong cham soc thanh cong")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesToAddActivity() throws Exception {
		ActivityCreateReq req = new ActivityCreateReq(ActivityType.CALL, LocalDateTime.of(2026, 1, 6, 14, 0),
				"sale01, chi Lan (khach hang)", "Goi gioi thieu giai phap CRM");
		when(opportunityActivityService.addActivity(eq(10L), any())).thenReturn(
				new ActivityRes(1L, 10L, ActivityType.CALL, LocalDateTime.of(2026, 1, 6, 14, 0),
						"sale01, chi Lan (khach hang)", "Goi gioi thieu giai phap CRM", "sale01",
						LocalDateTime.of(2026, 1, 6, 14, 5)));

		mockMvc.perform(post("/opportunities/10/activities")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.activityType").value("CALL"))
				.andExpect(jsonPath("$.data.opportunityId").value(10));
	}

	@Test
	@DisplayName("NCL-03-CN-006 TC-03: vai tro khac Nhan vien kinh doanh bi tu choi truy cap khi them hoat dong")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesNonSalesRoleOnAdd() throws Exception {
		ActivityCreateReq req = new ActivityCreateReq(ActivityType.CALL, LocalDateTime.now(), null, "Noi dung");

		mockMvc.perform(post("/opportunities/10/activities")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("NCL-03-CN-006 TC-03: vai tro khac Nhan vien kinh doanh bi tu choi truy cap khi xem dong thoi gian")
	@WithMockUser(authorities = "ROLE_VT-06")
	void deniesNonSalesRoleOnList() throws Exception {
		mockMvc.perform(get("/opportunities/10/activities"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("NCL-03-CN-006 TC-02: co hoi da dong thi tu choi them hoat dong voi loi INVALID_STATE")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsAddingActivityWhenOpportunityClosed() throws Exception {
		ActivityCreateReq req = new ActivityCreateReq(ActivityType.CALL, LocalDateTime.now(), null, "Noi dung");
		when(opportunityActivityService.addActivity(eq(10L), any()))
				.thenThrow(new com.serviceops.common.exception.BusinessRuleException(
						com.serviceops.common.exception.ErrorCode.INVALID_STATE,
						"Co hoi da dong, chi co the xem lai lich su cham soc, khong the them hoat dong moi"));

		mockMvc.perform(post("/opportunities/10/activities")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	@Test
	@DisplayName("Chua nhap noi dung trao doi thi bi tu choi voi loi 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsBlankContent() throws Exception {
		ActivityCreateReq req = new ActivityCreateReq(ActivityType.CALL, LocalDateTime.now(), null, "");

		mockMvc.perform(post("/opportunities/10/activities")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("Thieu loai hoat dong thi bi tu choi voi loi 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsMissingActivityType() throws Exception {
		String body = """
				{"occurredAt":"2026-01-06T14:00:00","content":"Noi dung"}
				""";

		mockMvc.perform(post("/opportunities/10/activities")
						.contentType("application/json")
						.content(body))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@DisplayName("NCL-03-CN-006: dong thoi gian cham soc cua co hoi")
	@WithMockUser(authorities = "ROLE_VT-04")
	void listsActivities() throws Exception {
		when(opportunityActivityService.listByOpportunity(10L)).thenReturn(List.of(
				new ActivityRes(2L, 10L, ActivityType.MEETING, LocalDateTime.of(2026, 1, 12, 9, 30), null,
						"Hop demo truc tiep", "sale01", LocalDateTime.of(2026, 1, 12, 11, 0))));

		mockMvc.perform(get("/opportunities/10/activities"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].activityType").value("MEETING"));
	}
}
