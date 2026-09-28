package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.invoice.controller.InvoiceController;
import com.serviceops.modules.invoice.dto.response.InvoiceRes;
import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.service.InvoiceService;
import com.serviceops.modules.invoice.service.MilestoneInvoiceService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tang HTTP cua {@code POST /contracts/{id}/milestones/{mid}/invoice} (NCL-10-CN-002).
 * TC-03: vai tro khac Ke toan (VT-05) nhan 403 va he thong ghi nhat ky lan tu choi.
 */
@WebMvcTest(controllers = InvoiceController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class InvoiceControllerTest {

	private static final String URL = "/contracts/5/milestones/7/invoice";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private MilestoneInvoiceService milestoneInvoiceService;

	@MockBean
	private InvoiceService invoiceService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToInvoiceMilestoneWithoutRequestBody() throws Exception {
		when(milestoneInvoiceService.createFromMilestone(eq(5L), eq(7L), any()))
				.thenReturn(new InvoiceRes(100L, "INV-20260921-ABC123", 5L, 7L, "Giai doan 1", "ISSUED",
						new BigDecimal("300000000.00"), LocalDate.of(2026, 9, 21), LocalDate.of(2026, 10, 21), null,
						new BigDecimal("1000000000.00"), new BigDecimal("300000000.00"), "ketoan01",
						LocalDateTime.of(2026, 9, 21, 10, 0)));

		mockMvc.perform(post(URL))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.invoiceCode").value("INV-20260921-ABC123"))
				.andExpect(jsonPath("$.data.status").value("ISSUED"))
				.andExpect(jsonPath("$.data.totalAmount").value(300000000.00));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesAndLogsDeniedAccessAsInvoiceFeature() throws Exception {
		mockMvc.perform(post(URL))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/invoice"));
		verify(milestoneInvoiceService, never()).createFromMilestone(any(), any(), any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void mapsExceedingContractValueTo400ValidationError() throws Exception {
		when(milestoneInvoiceService.createFromMilestone(eq(5L), eq(7L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
						"vuot gia tri hop dong. Vui long lap phu luc dieu chinh hop dong truoc (QTN-19)"));

		mockMvc.perform(post(URL))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void mapsMissingMilestoneTo404() throws Exception {
		when(milestoneInvoiceService.createFromMilestone(eq(5L), eq(7L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay moc"));

		mockMvc.perform(post(URL))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void listsInvoicesWithRepeatedStatusFilterAndDebtFigures() throws Exception {
		when(invoiceService.list(eq(5L), eq(List.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID))))
				.thenReturn(List.of(detail()));

		mockMvc.perform(get("/invoices").param("contractId", "5")
						.param("status", "ISSUED").param("status", "PARTIALLY_PAID"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data[0].invoiceCode").value("INV-20260921-ABC123"))
				.andExpect(jsonPath("$.data[0].paidAmount").value(60000000.00))
				.andExpect(jsonPath("$.data[0].remainingAmount").value(40000000.00));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void listsInvoicesWithoutFiltersPassingNulls() throws Exception {
		when(invoiceService.list(null, null)).thenReturn(List.of());

		mockMvc.perform(get("/invoices"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data").isEmpty());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsUnknownStatusFilterWith400() throws Exception {
		mockMvc.perform(get("/invoices").param("status", "NOT_A_STATUS"))
				.andExpect(status().isBadRequest());

		verify(invoiceService, never()).list(any(), any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsInvoiceDetailAnd404WhenMissing() throws Exception {
		when(invoiceService.get(9L)).thenReturn(detail());
		when(invoiceService.get(99L))
				.thenThrow(new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay hoa don"));

		mockMvc.perform(get("/invoices/9"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.customerName").value("Cong ty A"));
		mockMvc.perform(get("/invoices/99"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesInvoiceLookupForOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get("/invoices"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
		mockMvc.perform(get("/invoices/9"))
				.andExpect(status().isForbidden());

		verify(accessDeniedAuditRecorder, times(2)).record(eq("GET"), contains("/invoices"));
		verify(invoiceService, never()).list(any(), any());
		verify(invoiceService, never()).get(any());
	}

	private InvoiceDetailRes detail() {
		return new InvoiceDetailRes(9L, "INV-20260921-ABC123", 5L, "HD-TEST", 3L, "Cong ty A", "PARTIALLY_PAID",
				new BigDecimal("100000000.00"), new BigDecimal("60000000.00"), new BigDecimal("40000000.00"),
				LocalDate.of(2026, 9, 21), LocalDate.of(2026, 10, 21), null, "ketoan01",
				LocalDateTime.of(2026, 9, 21, 10, 0));
	}
}
