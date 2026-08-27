package com.serviceops.modules.customer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.customer.controller.CustomerContactController;
import com.serviceops.modules.customer.dto.request.CustomerContactReq;
import com.serviceops.modules.customer.dto.response.CustomerContactRes;
import com.serviceops.modules.customer.service.CustomerContactService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua chuc nang quan ly nguoi lien he khach hang
 * (NCL-02-CN-003): TC-01 them nguoi lien he, TC-02 dat dau moi chinh cho
 * nguoi lien he da co, TC-03 tu choi vai tro khong phai Nhan vien kinh doanh.
 */
@WebMvcTest(controllers = CustomerContactController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class CustomerContactControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private CustomerContactService customerContactService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("NCL-02-CN-003 TC-01: Nhan vien kinh doanh them nguoi lien he thanh cong")
	@WithMockUser(authorities = "ROLE_VT-04")
	void allowsSalesToAddContact() throws Exception {
		CustomerContactReq req = new CustomerContactReq("Nguyen Van A", "Giam doc mua hang",
				"a@congty.vn", "0901234567", true);
		when(customerContactService.addContact(any(), any())).thenReturn(
				new CustomerContactRes(1L, 10L, "Nguyen Van A", "Giam doc mua hang", "a@congty.vn",
						"0901234567", true, null));

		mockMvc.perform(post("/customers/10/contacts")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.fullName").value("Nguyen Van A"))
				.andExpect(jsonPath("$.data.isPrimary").value(true));
	}

	@Test
	@DisplayName("NCL-02-CN-003 TC-03: vai tro khac Nhan vien kinh doanh bi tu choi truy cap khi them nguoi lien he")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesNonSalesRoleOnAdd() throws Exception {
		CustomerContactReq req = new CustomerContactReq("Nguyen Van A", null, null, null, false);

		mockMvc.perform(post("/customers/10/contacts")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Chua nhap ho ten thi bi tu choi voi loi 400")
	@WithMockUser(authorities = "ROLE_VT-04")
	void rejectsBlankFullName() throws Exception {
		CustomerContactReq req = new CustomerContactReq("", null, null, null, false);

		mockMvc.perform(post("/customers/10/contacts")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("NCL-02-CN-003 TC-02: dat mot nguoi lien he da co lam dau moi chinh")
	@WithMockUser(authorities = "ROLE_VT-04")
	void setsExistingContactAsPrimary() throws Exception {
		when(customerContactService.setPrimary(10L, 2L)).thenReturn(
				new CustomerContactRes(2L, 10L, "Nguoi thu hai", null, null, null, true, null));

		mockMvc.perform(patch("/customers/10/contacts/2/primary"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.isPrimary").value(true));
	}

	@Test
	@DisplayName("NCL-02-CN-003 TC-03: vai tro khac Nhan vien kinh doanh bi tu choi truy cap khi dat dau moi chinh")
	@WithMockUser(authorities = "ROLE_VT-05")
	void deniesNonSalesRoleOnSetPrimary() throws Exception {
		mockMvc.perform(patch("/customers/10/contacts/2/primary"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Danh sach nguoi lien he cua khach hang")
	@WithMockUser(authorities = "ROLE_VT-04")
	void listsContacts() throws Exception {
		when(customerContactService.listByCustomer(10L)).thenReturn(
				List.of(new CustomerContactRes(2L, 10L, "Chinh", null, null, null, true, null)));

		mockMvc.perform(get("/customers/10/contacts"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].isPrimary").value(true));
	}
}
