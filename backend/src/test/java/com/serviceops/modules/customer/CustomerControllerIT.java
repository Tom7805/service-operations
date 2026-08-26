package com.serviceops.modules.customer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.customer.controller.CustomerController;
import com.serviceops.modules.customer.dto.request.CustomerCreateReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.service.CustomerService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua POST /customers (NCL-02-CN-001):
 * TC-01 tao thanh cong, TC-03 tu choi vai tro khong phu hop.
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
}
