package com.serviceops.modules.acceptance;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.acceptance.controller.AcceptanceCertificateController;
import com.serviceops.modules.acceptance.controller.DeliverableController;
import com.serviceops.modules.acceptance.dto.response.DeliverableVersionRes;
import com.serviceops.modules.acceptance.service.AcceptanceCertificateService;
import com.serviceops.modules.acceptance.service.AcceptanceConfirmationService;
import com.serviceops.modules.acceptance.service.AcceptanceMilestoneLinkService;
import com.serviceops.modules.acceptance.service.DeliverableService;
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

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tang HTTP cua Epic NCL-12: TC-03 cua ca 4 story (sai vai tro -> 403 va ghi "Tu choi truy cap"),
 * 401 khi chua dang nhap, 400 khi thieu truong bat buoc.
 */
@WebMvcTest(controllers = {AcceptanceCertificateController.class, DeliverableController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class AcceptanceControllerIT {

	@Autowired private MockMvc mockMvc;

	@MockBean private AcceptanceCertificateService certificateService;
	@MockBean private AcceptanceConfirmationService confirmationService;
	@MockBean private AcceptanceMilestoneLinkService milestoneLinkService;
	@MockBean private DeliverableService deliverableService;
	@MockBean private AccessDeniedAuditRecorder accessDeniedAuditRecorder;
	@MockBean private JwtProvider jwtProvider;
	@MockBean private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("NCL-12-CN-001-TC-03: khong phai Quan ly du an -> 403 va ghi nhat ky tu choi")
	@WithMockUser(authorities = "ROLE_VT-05")
	void createCertificateDeniedForNonProjectManager() throws Exception {
		mockMvc.perform(post("/projects/1/acceptances").contentType("application/json")
						.content("{\"workPackageId\":2,\"acceptedValue\":100}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
		verify(accessDeniedAuditRecorder).record(eq("POST"), eq("/projects/1/acceptances"));
		verifyNoInteractions(certificateService);
	}

	@Test
	@DisplayName("NCL-12-CN-002-TC-03: khong phai Quan ly du an -> 403 khi xac nhan/tu choi phieu")
	@WithMockUser(authorities = "ROLE_VT-09")
	void confirmAndRejectDeniedForOtherRoles() throws Exception {
		mockMvc.perform(post("/acceptances/5/confirm").contentType("application/json")
						.content("{\"signerName\":\"A\",\"signedDate\":\"2026-09-24\",\"minutesUrl\":\"/f.pdf\"}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(post("/acceptances/5/reject").contentType("application/json")
						.content("{\"reason\":\"x\"}"))
				.andExpect(status().isForbidden());
		verifyNoInteractions(confirmationService);
	}

	@Test
	@DisplayName("NCL-12-CN-003-TC-03: khong phai Ke toan -> 403 khi gan phieu voi moc thanh toan")
	@WithMockUser(authorities = "ROLE_VT-02")
	void milestoneLinkDeniedForNonAccountant() throws Exception {
		mockMvc.perform(put("/acceptances/5/payment-milestone").contentType("application/json")
						.content("{\"contractMilestoneId\":7}"))
				.andExpect(status().isForbidden());
		mockMvc.perform(delete("/acceptances/5/payment-milestone"))
				.andExpect(status().isForbidden());
		mockMvc.perform(get("/contracts/3/milestone-acceptances"))
				.andExpect(status().isForbidden());
		verifyNoInteractions(milestoneLinkService);
	}

	@Test
	@DisplayName("NCL-12-CN-004-TC-03: khong phai Quan ly du an -> 403 khi quan ly san pham ban giao")
	@WithMockUser(authorities = "ROLE_VT-03")
	void deliverablesDeniedForNonProjectManager() throws Exception {
		mockMvc.perform(get("/projects/1/deliverables")).andExpect(status().isForbidden());
		mockMvc.perform(post("/deliverables/9/versions").contentType("application/json")
						.content("{\"versionNo\":\"1\",\"deliveredDate\":\"2026-09-24\",\"receiverName\":\"A\"}"))
				.andExpect(status().isForbidden());
		verifyNoInteractions(deliverableService);
	}

	@Test
	@DisplayName("Chua dang nhap -> 401")
	void unauthenticatedIsRejected() throws Exception {
		mockMvc.perform(get("/acceptances")).andExpect(status().isUnauthorized());
	}

	@Test
	@DisplayName("NCL-12-CN-002: xac nhan thieu bien ban / nguoi ky -> 400 VALIDATION_ERROR")
	@WithMockUser(authorities = "ROLE_VT-02")
	void confirmRequiresSignerAndMinutes() throws Exception {
		mockMvc.perform(post("/acceptances/5/confirm").contentType("application/json")
						.content("{\"signedDate\":\"2026-09-24\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
		verifyNoInteractions(confirmationService);
	}

	@Test
	@DisplayName("NCL-12-CN-004-TC-01: Quan ly du an ghi nhan phien ban moi -> 200")
	@WithMockUser(authorities = "ROLE_VT-02")
	void projectManagerAddsVersion() throws Exception {
		when(deliverableService.addVersion(eq(9L), any())).thenReturn(new DeliverableVersionRes(20L, 9L, "v2",
				LocalDate.of(2026, 9, 24), "A", null, null, true, "pm", LocalDateTime.of(2026, 9, 24, 10, 0)));

		mockMvc.perform(post("/deliverables/9/versions").contentType("application/json")
						.content("{\"versionNo\":\"v2\",\"deliveredDate\":\"2026-09-24\",\"receiverName\":\"A\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.versionNo").value("v2"))
				.andExpect(jsonPath("$.data.latest").value(true));
		verify(deliverableService).addVersion(eq(9L), any());
	}

	@Test
	@DisplayName("Ke toan tra cuu phieu theo hop dong -> 200")
	@WithMockUser(authorities = "ROLE_VT-05")
	void accountantSearchesCertificates() throws Exception {
		mockMvc.perform(get("/acceptances").param("contractId", "3").param("status", "ACCEPTED"))
				.andExpect(status().isOk());
		verify(certificateService).search(eq(3L), isNull(), any());
	}
}
