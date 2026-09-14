package com.serviceops.modules.customer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.customer.controller.CustomerMergeController;
import com.serviceops.modules.customer.dto.request.CustomerMergeReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.MergePreviewRes;
import com.serviceops.modules.customer.service.CustomerMergeService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiem tra tang HTTP cua chuc nang gop hai ho so khach hang trung (NCL-02-CN-006):
 * - TC-03: chi Quan tri vien (VT-07) duoc goi, vai tro khac bi tu choi (403).
 * - Luong thanh cong tra ve ho so giu lai sau khi gop.
 */
@WebMvcTest(controllers = CustomerMergeController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class CustomerMergeControllerIT {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private CustomerMergeService customerMergeService;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("TC-01: Quan tri vien goi gop ho so thi thanh cong")
	@WithMockUser(authorities = "ROLE_VT-07")
	void allowsAdminToMergeCustomers() throws Exception {
		CustomerMergeReq req = new CustomerMergeReq(1L, 2L);
		when(customerMergeService.merge(any())).thenReturn(
				new CustomerRes(1L, "KH-000001", "Cong ty TNHH ABC", "0101234567", "0987654321", "Cong nghe", "Ha Noi", null));

		mockMvc.perform(post("/customers/merge")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.id").value(1))
				.andExpect(jsonPath("$.data.code").value("KH-000001"));
	}

	@Test
	@DisplayName("TC-03: khong phai Quan tri vien thi bi tu choi truy cap")
	@WithMockUser(authorities = "ROLE_VT-04")
	void deniesNonAdminRoles() throws Exception {
		CustomerMergeReq req = new CustomerMergeReq(1L, 2L);

		mockMvc.perform(post("/customers/merge")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}

	@Test
	@DisplayName("Thieu ho so giu lai hoac ho so bi gop thi bao loi du lieu khong hop le")
	@WithMockUser(authorities = "ROLE_VT-07")
	void rejectsMissingCustomerIds() throws Exception {
		CustomerMergeReq req = new CustomerMergeReq(null, null);

		mockMvc.perform(post("/customers/merge")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isBadRequest());
	}

	@Test
	@DisplayName("Xem truoc: Quan tri vien goi thi tra ve du lieu xem truoc, khong phai Quan tri vien thi bi tu choi")
	@WithMockUser(authorities = "ROLE_VT-07")
	void previewReturnsDataForAdmin() throws Exception {
		CustomerMergeReq req = new CustomerMergeReq(1L, 2L);
		CustomerRes target = new CustomerRes(1L, "KH-000001", "Cong ty TNHH ABC", null, null, null, null, null);
		CustomerRes source = new CustomerRes(2L, "KH-000002", "Cong ty TNHH ABC (chi nhanh)", null, null, null, null, null);
		when(customerMergeService.preview(any())).thenReturn(new MergePreviewRes(target, source, 3L));

		mockMvc.perform(post("/customers/merge/preview")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.targetCustomer.code").value("KH-000001"))
				.andExpect(jsonPath("$.data.sourceCustomer.code").value("KH-000002"))
				.andExpect(jsonPath("$.data.relatedRecordCount").value(3));
	}

	@Test
	@DisplayName("TC-03: xem truoc cung bi tu choi neu khong phai Quan tri vien")
	@WithMockUser(authorities = "ROLE_VT-02")
	void previewDeniesNonAdminRoles() throws Exception {
		CustomerMergeReq req = new CustomerMergeReq(1L, 2L);

		mockMvc.perform(post("/customers/merge/preview")
						.contentType("application/json")
						.content(objectMapper.writeValueAsString(req)))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
	}
}
