package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.invoice.controller.PaymentController;
import com.serviceops.modules.invoice.dto.response.PaymentRes;
import com.serviceops.modules.invoice.service.PaymentService;
import com.serviceops.security.CustomUserDetailsService;
import com.serviceops.security.JwtAuthFilter;
import com.serviceops.security.JwtAuthenticationEntryPoint;
import com.serviceops.security.JwtProvider;
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
 * Tang HTTP cua {@code POST /invoices/{id}/payments} (NCL-10-CN-003).
 * TC-04: vai tro khac Ke toan (VT-05) nhan 403 va he thong ghi nhat ky lan tu choi.
 */
@WebMvcTest(controllers = PaymentController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class PaymentControllerTest {

	private static final String URL = "/invoices/9/payments";
	private static final String BODY = """
			{"amount": 60000000, "paymentDate": "2026-09-20", "method": "BANK_TRANSFER", "note": "Dot 1"}
			""";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private PaymentService paymentService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void allowsAccountantToRecordPayment() throws Exception {
		when(paymentService.recordPayment(eq(9L), any()))
				.thenReturn(new PaymentRes(500L, 9L, "INV-TEST", new BigDecimal("60000000.00"),
						LocalDate.of(2026, 9, 20), "BANK_TRANSFER", "Dot 1", new BigDecimal("100000000.00"),
						new BigDecimal("60000000.00"), new BigDecimal("40000000.00"), "PARTIALLY_PAID",
						"ketoan01", LocalDateTime.of(2026, 9, 21, 10, 0)));

		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.invoiceStatus").value("PARTIALLY_PAID"))
				.andExpect(jsonPath("$.data.remainingAmount").value(40000000.00));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesAndLogsDeniedAccessAsPaymentFeature() throws Exception {
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("POST"), contains("/payments"));
		verify(paymentService, never()).recordPayment(any(), any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsMissingOrNonPositiveFieldsWith400() throws Exception {
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
						.content("{\"amount\": 0, \"paymentDate\": \"2026-09-20\", \"method\": \"CASH\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{\"amount\": 100}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

		verify(paymentService, never()).recordPayment(any(), any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void mapsAmountAboveRemainingDebtTo400ValidationError() throws Exception {
		when(paymentService.recordPayment(eq(9L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "lon hon so con phai thu"));

		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void mapsMissingInvoiceTo404() throws Exception {
		when(paymentService.recordPayment(eq(9L), any()))
				.thenThrow(new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay hoa don"));

		mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
	}
}
