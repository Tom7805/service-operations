package com.serviceops.common;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.serviceops.common.api.PageRes;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.contract.controller.ContractPageController;
import com.serviceops.modules.contract.dto.response.ContractPageSummaryRes;
import com.serviceops.modules.contract.enums.ContractStatus;
import com.serviceops.modules.contract.service.ContractPageQueryService;
import com.serviceops.modules.customer.controller.CustomerPageController;
import com.serviceops.modules.customer.dto.response.CustomerPageSummaryRes;
import com.serviceops.modules.customer.service.CustomerPageQueryService;
import com.serviceops.modules.opportunity.controller.OpportunityPageController;
import com.serviceops.modules.opportunity.dto.response.OpportunityPageSummaryRes;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.service.OpportunityPageQueryService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;

/**
 * Tang HTTP cua cac danh sach phan trang moi: cung quyen voi endpoint danh sach cu, tham so
 * loc/phan trang duoc chuyen dung xuong service, va hinh dang JSON {content, page, ..., summary}.
 */
@WebMvcTest(controllers = { CustomerPageController.class, OpportunityPageController.class,
		ContractPageController.class })
@Import({ SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class })
class PagedListControllersTest {

	@Autowired private MockMvc mockMvc;

	@MockBean private CustomerPageQueryService customerPageQueryService;
	@MockBean private OpportunityPageQueryService opportunityPageQueryService;
	@MockBean private ContractPageQueryService contractPageQueryService;
	@MockBean private JwtProvider jwtProvider;
	@MockBean private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("GET /customers/paged: Sales xem duoc, tra ve trang + so lieu tong hop")
	@WithMockUser(authorities = "ROLE_VT-04")
	void customersPagedForSales() throws Exception {
		when(customerPageQueryService.findPage(any())).thenReturn(new PageRes<>(List.of(), 0, 20, 57, 3,
				new CustomerPageSummaryRes(57, 2, List.of("Cong nghe"), List.of(), List.of())));

		mockMvc.perform(get("/customers/paged").param("keyword", "abc").param("page", "0").param("size", "20"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.totalElements").value(57))
				.andExpect(jsonPath("$.data.totalPages").value(3))
				.andExpect(jsonPath("$.data.summary.createdToday").value(2))
				.andExpect(jsonPath("$.data.summary.industries[0]").value("Cong nghe"));
	}

	@Test
	@DisplayName("GET /customers/paged: vai tro khac bi tu choi")
	@WithMockUser(authorities = "ROLE_VT-05")
	void customersPagedDeniedForOthers() throws Exception {
		mockMvc.perform(get("/customers/paged")).andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("GET /opportunities/paged: Ban giam doc xem duoc, tham so giai doan/id duoc chuyen xuong service")
	@WithMockUser(authorities = "ROLE_VT-01")
	void opportunitiesPagedPassesFilters() throws Exception {
		when(opportunityPageQueryService.findPage(any(), any(), any(), anyBoolean(), any(), any())).thenReturn(new PageRes<>(
				List.of(), 1, 10, 0, 0, new OpportunityPageSummaryRes(0, BigDecimal.ZERO, BigDecimal.ZERO, 0)));

		mockMvc.perform(get("/opportunities/paged").param("keyword", "erp").param("stage", "WON").param("ids", "7", "9")
				.param("includeSummary", "false")
				.param("page", "1").param("size", "10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.page").value(1));

		verify(opportunityPageQueryService).findPage(eq("erp"), eq(OpportunityStage.WON), eq(List.of(7L, 9L)), eq(false),
				eq(1), eq(10));
	}

	@Test
	@DisplayName("GET /opportunities/paged: Ke toan khong xem duoc pipeline")
	@WithMockUser(authorities = "ROLE_VT-05")
	void opportunitiesPagedDeniedForAccountant() throws Exception {
		mockMvc.perform(get("/opportunities/paged")).andExpect(status().isForbidden());
	}

	@Test
	@DisplayName("GET /contracts/paged: Ke toan xem duoc; Sales bi tu choi")
	@WithMockUser(authorities = "ROLE_VT-05")
	void contractsPagedForAccountant() throws Exception {
		when(contractPageQueryService.findPage(any(), any(), anyBoolean(), any(), any()))
				.thenReturn(new PageRes<>(List.of(), 0, 20, 0, 0, new ContractPageSummaryRes(3, 2, 1, 1)));

		mockMvc.perform(get("/contracts/paged").param("status", "ACTIVE"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.summary.active").value(2));

		verify(contractPageQueryService).findPage(eq(null), eq(ContractStatus.ACTIVE), eq(true), eq(null), eq(null));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-04")
	void contractsPagedDeniedForSales() throws Exception {
		mockMvc.perform(get("/contracts/paged")).andExpect(status().isForbidden());
	}
}
