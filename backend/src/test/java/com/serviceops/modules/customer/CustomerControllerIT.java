package com.serviceops.modules.customer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.customer.controller.CustomerController;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.request.CustomerCreateWithOverrideReq;
import com.serviceops.modules.customer.dto.request.DuplicateOverrideReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.CustomerOverviewRes;
import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;
import com.serviceops.modules.customer.service.CustomerOverviewService;
import com.serviceops.modules.customer.service.CustomerService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua module khach hang:
 * - POST /customers (NCL-02-CN-001): TC-01 tao thanh cong, TC-03 tu choi vai tro khong phu hop.
 * - POST /customers/check-duplicate va /customers/create-with-override (NCL-02-CN-002):
 *   TC-01 tra ve danh sach nghi trung, TC-02 tao voi ly do bo qua, TC-04 tu choi vai tro khong phu hop.
 */
@WebMvcTest(controllers = CustomerController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class CustomerControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private CustomerService customerService;

	@MockBean
	private CustomerOverviewService customerOverviewService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesRoleToCreateCustomer() throws Exception {
		CustomerCreateReq req = new CustomerCreateReq("Cong ty TNHH ABC", "0101234567", "0987654321", "Cong nghe", "Ha Noi");
		when(customerService.create(any())).thenReturn(
				new CustomerRes(1L, "KH-000001", "Cong ty TNHH ABC", "0101234567", "0987654321", "Cong nghe", "Ha Noi", null));

		mockMvc.perform(post("/customers")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.code").value("KH-000001"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void deniesOtherRoles() throws Exception {
		CustomerCreateReq req = new CustomerCreateReq("Cong ty TNHH ABC", null, null, null, null);

		mockMvc.perform(post("/customers")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsBlankName() throws Exception {
		CustomerCreateReq req = new CustomerCreateReq("", null, null, null, null);

		mockMvc.perform(post("/customers")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("NCL-02-CN-002 TC-01: check-duplicate tra ve danh sach ho so nghi trung")
	@WithMockUser(authorities = "ROLE_VT-04")
	void checkDuplicateReturnsCandidates() throws Exception {
		CustomerCreateReq req = new CustomerCreateReq("Cong ty TNHH ABC", "0101234567", null, null, null);
		when(customerService.checkDuplicates(any())).thenReturn(List.of(
				new DuplicateCandidateRes(9L, "KH-000009", "Cong ty TNHH ABC", "0101234567", "0987654321",
						0.95, List.of("maSoThue"))));

		mockMvc.perform(post("/customers/check-duplicate")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].code").value("KH-000009"))
				.andExpect(jsonPath("$.data[0].similarity").value(0.95));
	}

	@Test
	@DisplayName("NCL-02-CN-002 TC-04: check-duplicate tu choi vai tro khong phai Sales/PM")
	@WithMockUser(authorities = "ROLE_VT-05")
	void checkDuplicateDeniesOtherRoles() throws Exception {
		CustomerCreateReq req = new CustomerCreateReq("Cong ty TNHH ABC", null, null, null, null);

		mockMvc.perform(post("/customers/check-duplicate")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("NCL-02-CN-002 TC-02: create-with-override tao ho so thanh cong khi co ly do")
	@WithMockUser(authorities = "ROLE_VT-02")
	void createWithOverrideSucceedsWithReason() throws Exception {
		CustomerCreateWithOverrideReq req = new CustomerCreateWithOverrideReq(
				new CustomerCreateReq("Cong ty TNHH ABC", "0101234567", null, null, null),
				new DuplicateOverrideReq("Hai phap nhan khac nhau, chi trung ten viet tat"));
		when(customerService.createWithOverride(any(), any())).thenReturn(
				new CustomerRes(2L, "KH-000002", "Cong ty TNHH ABC", "0101234567", null, null, null, null));

		mockMvc.perform(post("/customers/create-with-override")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.code").value("KH-000002"));
	}

	@Test
	@DisplayName("NCL-02-CN-002 TC-02: create-with-override bat buoc phai co ly do")
	@WithMockUser(authorities = "ROLE_VT-04")
	void createWithOverrideRequiresReason() throws Exception {
		CustomerCreateWithOverrideReq req = new CustomerCreateWithOverrideReq(
				new CustomerCreateReq("Cong ty TNHH ABC", null, null, null, null),
				new DuplicateOverrideReq(""));

		mockMvc.perform(post("/customers/create-with-override")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("NCL-02-CN-002 TC-04: create-with-override tu choi vai tro khong phai Sales/PM")
	@WithMockUser(authorities = "ROLE_VT-06")
	void createWithOverrideDeniesOtherRoles() throws Exception {
		CustomerCreateWithOverrideReq req = new CustomerCreateWithOverrideReq(
				new CustomerCreateReq("Cong ty TNHH ABC", null, null, null, null),
				new DuplicateOverrideReq("Ly do hop le"));

		mockMvc.perform(post("/customers/create-with-override")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("NCL-02-CN-004 TC-01: PM xem duoc ho so tong hop khach hang")
	@WithMockUser(authorities = "ROLE_VT-02")
	void projectManagerCanViewCustomerOverview() throws Exception {
		CustomerRes customer = new CustomerRes(1L, "KH-000001", "Cong ty TNHH ABC", null, null, null, null, null);
		when(customerOverviewService.getOverview(1L)).thenReturn(
				new CustomerOverviewRes(customer, List.of(), List.of(), List.of(), List.of(), List.of()));

		mockMvc.perform(get("/customers/1/overview"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.customer.code").value("KH-000001"))
				.andExpect(jsonPath("$.data.opportunities").isArray());
	}

	@Test
	@DisplayName("NCL-02-CN-004 TC-03: vai tro khong phu hop khong xem duoc ho so tong hop")
	@WithMockUser(authorities = "ROLE_VT-05")
	void overviewDeniesOtherRoles() throws Exception {
		mockMvc.perform(get("/customers/1/overview"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}
}
