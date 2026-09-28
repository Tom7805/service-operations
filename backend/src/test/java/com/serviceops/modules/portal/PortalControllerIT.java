package com.serviceops.modules.portal;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.portal.controller.PortalAcceptanceController;
import com.serviceops.modules.portal.controller.PortalAccountController;
import com.serviceops.modules.portal.controller.PortalInvoiceController;
import com.serviceops.modules.portal.controller.PortalProjectController;
import com.serviceops.modules.portal.service.PortalAcceptanceService;
import com.serviceops.modules.portal.service.PortalAccountService;
import com.serviceops.modules.portal.service.PortalInvoiceService;
import com.serviceops.modules.portal.service.PortalProjectService;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tang HTTP cua Epic NCL-13: TC "Khong co quyen" cua ca 4 story (403 + ghi "Tu choi truy cap"), 401 khi chua
 * dang nhap, 400 khi thieu truong bat buoc, va hang rao QTN-26 cua {@code SecurityConfig}: tai khoan cong khong
 * goi duoc API noi bo, tai khoan noi bo khong goi duoc {@code /portal/**}.
 */
@WebMvcTest(controllers = {PortalAccountController.class, PortalProjectController.class,
		PortalAcceptanceController.class, PortalInvoiceController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class PortalControllerIT {

	@Autowired private MockMvc mockMvc;

	@MockBean private PortalAccountService portalAccountService;
	@MockBean private PortalProjectService portalProjectService;
	@MockBean private PortalAcceptanceService portalAcceptanceService;
	@MockBean private PortalInvoiceService portalInvoiceService;
	@MockBean private AccessDeniedAuditRecorder accessDeniedAuditRecorder;
	@MockBean private JwtProvider jwtProvider;
	@MockBean private CustomUserDetailsService customUserDetailsService;

	// ------------------------------------------------------------ NCL-13-CN-001

	@Test
	@DisplayName("NCL-13-CN-001-TC-03: khong phai Quan tri vien -> 403 va ghi nhat ky tu choi")
	void grantDeniedForNonAdmin() throws Exception {
		mockMvc.perform(post("/portal-accounts").with(user("VT-02")).contentType("application/json")
						.content("{\"contactId\":1,\"username\":\"nhi.a\",\"password\":\"Matkhau123\"}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
		mockMvc.perform(patch("/portal-accounts/5/status").with(user("VT-01")).contentType("application/json")
						.content("{\"status\":\"LOCKED\"}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/portal-accounts/candidates").param("customerId", "1").with(user("VT-04")))
				.andExpect(status().isForbidden());
		verify(accessDeniedAuditRecorder).record(eq("POST"), eq("/portal-accounts"));
		verifyNoInteractions(portalAccountService);
	}

	@Test
	@DisplayName("NCL-13-CN-001: Quan tri vien cap tai khoan thieu du lieu -> 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-07")
	void grantValidation() throws Exception {
		mockMvc.perform(post("/portal-accounts").contentType("application/json")
						.content("{\"contactId\":1,\"username\":\"co khoang trang\",\"password\":\"ngan\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
		mockMvc.perform(patch("/portal-accounts/5/status").contentType("application/json").content("{}"))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(portalAccountService);
	}

	@Test
	@DisplayName("NCL-13-CN-001-TC-01/02: Quan tri vien cap, tra cuu va khoa tai khoan cong -> 200")
	@WithMockUser(authorities = "ROLE_VT-07")
	void adminManagesAccounts() throws Exception {
		mockMvc.perform(post("/portal-accounts").contentType("application/json")
						.content("{\"contactId\":1,\"username\":\"nhi.a\",\"password\":\"Matkhau123\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Cap tai khoan cong khach hang thanh cong"));
		mockMvc.perform(get("/portal-accounts").param("customerId", "1001")).andExpect(status().isOk());
		mockMvc.perform(get("/portal-accounts/candidates").param("customerId", "1001")).andExpect(status().isOk());
		verify(portalAccountService).listCandidates(1001L);
		mockMvc.perform(patch("/portal-accounts/5/status").contentType("application/json")
						.content("{\"status\":\"LOCKED\",\"reason\":\"Nghi viec\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Khoa tai khoan cong thanh cong"));
		verify(portalAccountService).create(any());
		verify(portalAccountService).search(eq(1001L), isNull());
		verify(portalAccountService).updateStatus(eq(5L), any());
	}

	// ------------------------------------------------------------ NCL-13-CN-002

	@Test
	@DisplayName("NCL-13-CN-002-TC-01: khach hang xem danh sach du an -> 200")
	void customerListsProjects() throws Exception {
		when(portalProjectService.listMyProjects()).thenReturn(List.of());
		mockMvc.perform(get("/portal/projects").with(user("VT-09"))).andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true));
		mockMvc.perform(get("/portal/projects/12").with(user("VT-09"))).andExpect(status().isOk());
		verify(portalProjectService).getProgress(12L);
	}

	@Test
	@DisplayName("NCL-13-CN-002-TC-04: nguoi dung khong phai nguoi dung cong -> 403 va ghi nhat ky tu choi")
	void internalUserCannotUsePortal() throws Exception {
		mockMvc.perform(get("/portal/projects").with(user("VT-02")))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
		mockMvc.perform(get("/portal/projects/12").with(user("VT-07"))).andExpect(status().isForbidden());
		verify(accessDeniedAuditRecorder).record(eq("GET"), eq("/portal/projects"));
		verifyNoInteractions(portalProjectService);
	}

	@Test
	@DisplayName("Chua dang nhap -> 401 tren cong")
	void unauthenticatedIsRejected() throws Exception {
		mockMvc.perform(get("/portal/projects")).andExpect(status().isUnauthorized());
		mockMvc.perform(get("/portal/invoices")).andExpect(status().isUnauthorized());
	}

	// ------------------------------------------------------------ NCL-13-CN-003

	@Test
	@DisplayName("NCL-13-CN-003-TC-02: tu choi khong nhap ly do -> 400 VALIDATION_ERROR")
	void rejectRequiresReason() throws Exception {
		mockMvc.perform(post("/portal/acceptances/5/reject").with(user("VT-09")).contentType("application/json")
						.content("{\"reason\":\"   \"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
		mockMvc.perform(post("/portal/acceptances/5/reject").with(user("VT-09")).contentType("application/json"))
				.andExpect(status().isBadRequest());
		verifyNoInteractions(portalAcceptanceService);
	}

	@Test
	@DisplayName("NCL-13-CN-003-TC-01: khach hang xac nhan phieu -> 200")
	void customerConfirms() throws Exception {
		mockMvc.perform(post("/portal/acceptances/5/confirm").with(user("VT-09")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Xac nhan nghiem thu thanh cong"));
		verify(portalAcceptanceService).confirm(5L);
	}

	@Test
	@DisplayName("NCL-13-CN-003-TC-03: khong phai nguoi dung cong (ke ca Quan ly du an) -> 403 khi duyet phieu tren cong")
	void acceptanceDeniedForInternalUsers() throws Exception {
		mockMvc.perform(post("/portal/acceptances/5/confirm").with(user("VT-02"))).andExpect(status().isForbidden());
		mockMvc.perform(post("/portal/acceptances/5/reject").with(user("VT-05")).contentType("application/json")
				.content("{\"reason\":\"x\"}")).andExpect(status().isForbidden());
		verify(accessDeniedAuditRecorder).record(eq("POST"), eq("/portal/acceptances/5/confirm"));
		verifyNoInteractions(portalAcceptanceService);
	}

	// ------------------------------------------------------------ NCL-13-CN-004

	@Test
	@DisplayName("NCL-13-CN-004-TC-03: khong phai nguoi dung cong -> 403 khi xem hoa don tren cong")
	void invoicesDeniedForInternalUsers() throws Exception {
		mockMvc.perform(get("/portal/invoices").with(user("VT-05"))).andExpect(status().isForbidden());
		mockMvc.perform(get("/portal/invoices/summary").with(user("VT-01"))).andExpect(status().isForbidden());
		verifyNoInteractions(portalInvoiceService);
	}

	@Test
	@DisplayName("NCL-13-CN-004-TC-01: khach hang xem hoa don, tong hop cong no va chi tiet -> 200")
	void customerReadsInvoices() throws Exception {
		mockMvc.perform(get("/portal/invoices").with(user("VT-09")).param("overdueOnly", "true"))
				.andExpect(status().isOk());
		mockMvc.perform(get("/portal/invoices/summary").with(user("VT-09"))).andExpect(status().isOk());
		mockMvc.perform(get("/portal/invoices/9").with(user("VT-09"))).andExpect(status().isOk());
		verify(portalInvoiceService).list(isNull(), eq(true));
		verify(portalInvoiceService).summary();
		verify(portalInvoiceService).get(9L);
	}

	// ------------------------------------------------------------ QTN-26 — hang rao API noi bo

	@Test
	@DisplayName("QTN-26: tai khoan cong goi API noi bo (ke ca endpoint khong gan @PreAuthorize) -> 403 + nhat ky")
	void portalUserCannotCallInternalApis() throws Exception {
		mockMvc.perform(get("/departments").with(user("VT-09"))).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
		mockMvc.perform(get("/customers/1/overview").with(user("VT-09"))).andExpect(status().isForbidden());
		mockMvc.perform(get("/portal-accounts").with(user("VT-09"))).andExpect(status().isForbidden());
		mockMvc.perform(get("/me/tasks").with(user("VT-09"))).andExpect(status().isForbidden());
		verify(accessDeniedAuditRecorder).record(eq("GET"), eq("/departments"));
		verifyNoInteractions(portalAccountService);
	}

	private static RequestPostProcessor user(String role) {
		return SecurityMockMvcRequestPostProcessors.user("user-" + role)
				.authorities(new SimpleGrantedAuthority("ROLE_" + role));
	}
}
