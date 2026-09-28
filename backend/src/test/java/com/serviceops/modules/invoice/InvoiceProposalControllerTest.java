package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.invoice.controller.InvoiceProposalController;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalLineRes;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalRes;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalSkippedRes;
import com.serviceops.modules.invoice.service.InvoiceProposalService;
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
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tang HTTP cua {@code POST /projects/{id}/invoice-proposals} (NCL-10-CN-001).
 * TC-04: vai tro khac Ke toan (VT-05) nhan 403 va he thong ghi nhat ky lan tu choi.
 */
@WebMvcTest(controllers = InvoiceProposalController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class InvoiceProposalControllerTest {

	private static final String URL = "/projects/1/invoice-proposals";
	private static final String BODY = "{\"periodFrom\":\"2026-09-01\",\"periodTo\":\"2026-09-30\",\"note\":\"Ky thang 9\"}";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private InvoiceProposalService invoiceProposalService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToCreateProposalAndReturnsLinesAndTotal() throws Exception {
		when(invoiceProposalService.createFromApprovedTimesheets(eq(1L), any()))
				.thenReturn(proposal(new InvoiceProposalSkippedRes(0, 0, 0, 0)));

		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.message").value("Tao de nghi xuat hoa don thanh cong"))
				.andExpect(jsonPath("$.data.proposalCode").value("IP-20261001-ABC123"))
				.andExpect(jsonPath("$.data.status").value("PENDING"))
				.andExpect(jsonPath("$.data.totalAmount").value(2400000.00))
				.andExpect(jsonPath("$.data.laborLines[0].timeEntryId").value(11))
				.andExpect(jsonPath("$.data.laborLines[0].amount").value(2400000.00));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	@DisplayName("NCL-10-CN-001-TC-02: message neu ro so dong bi bo qua")
	void mentionsSkippedLineCountInMessageWhenSomeLinesWereSkipped() throws Exception {
		when(invoiceProposalService.createFromApprovedTimesheets(eq(1L), any()))
				.thenReturn(proposal(new InvoiceProposalSkippedRes(5, 0, 0, 0)));

		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message", containsString("bo qua 5 dong gio cong")))
				.andExpect(jsonPath("$.message", containsString("5 chua duyet")))
				.andExpect(jsonPath("$.data.skipped.notApprovedCount").value(5));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	@DisplayName("NCL-10-CN-001-TC-04: vai tro khac Ke toan bi 403 va he thong ghi nhat ky lan tu choi")
	void deniesOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/invoice-proposals"));
		verify(invoiceProposalService, never()).createFromApprovedTimesheets(any(), any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-01")
	void deniesBoardRoleToo() throws Exception {
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isForbidden());
		verify(invoiceProposalService, never()).createFromApprovedTimesheets(any(), any());
	}

	@Test
	void rejectsRequestsWithoutToken() throws Exception {
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isUnauthorized());
		verify(invoiceProposalService, never()).createFromApprovedTimesheets(any(), any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsMissingPeriodDatesWith400AndFieldErrors() throws Exception {
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.length()").value(2));
		verify(invoiceProposalService, never()).createFromApprovedTimesheets(any(), any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	@DisplayName("Ngay sai dinh dang (2026-13-45) tra 400 VALIDATION_ERROR, khong phai 500")
	void rejectsMalformedDateWith400() throws Exception {
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
						.content("{\"periodFrom\":\"2026-13-45\",\"periodTo\":\"2026-09-30\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsRequestWithoutBodyWith400() throws Exception {
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsTooLongNote() throws Exception {
		String note = "x".repeat(1001);
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
						.content("{\"periodFrom\":\"2026-09-01\",\"periodTo\":\"2026-09-30\",\"note\":\"" + note + "\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void mapsMissingProjectTo404() throws Exception {
		when(invoiceProposalService.createFromApprovedTimesheets(eq(1L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay du an"));

		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void mapsNothingEligibleAndWrongContractTypeTo400InvalidState() throws Exception {
		when(invoiceProposalService.createFromApprovedTimesheets(eq(1L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.INVALID_STATE, "Khong co dong gio cong nao du dieu kien"));

		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("INVALID_STATE"));
	}

	private InvoiceProposalRes proposal(InvoiceProposalSkippedRes skipped) {
		InvoiceProposalLineRes line = new InvoiceProposalLineRes(1001L, "LABOR", 11L, null,
				LocalDate.of(2026, 9, 10), 3L, new BigDecimal("8.00"), new BigDecimal("300000.0000"),
				"Gio cong ngay 2026-09-10 - Phat trien API", new BigDecimal("2400000.00"));
		return new InvoiceProposalRes(100L, "IP-20261001-ABC123", 1L, 5L, 9L, LocalDate.of(2026, 9, 1),
				LocalDate.of(2026, 9, 30), "PENDING", new BigDecimal("2400000.00"), BigDecimal.ZERO.setScale(2),
				new BigDecimal("2400000.00"), "Ky thang 9", List.of(line), List.of(), skipped, "ketoan01",
				LocalDateTime.of(2026, 10, 1, 10, 0));
	}
}
