package com.serviceops.modules.invoice;

import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.config.SecurityConfig;
import com.serviceops.modules.invoice.controller.ReceivableController;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes.BucketRes;
import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes.ItemRes;
import com.serviceops.modules.invoice.enums.AgingBucket;
import com.serviceops.modules.invoice.service.ReceivableService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tang HTTP cua {@code GET /receivables/overdue} (NCL-10-CN-004).
 * TC-03: vai tro khac Ke toan (VT-05) nhan 403 va he thong ghi nhat ky lan tu choi.
 */
@WebMvcTest(controllers = ReceivableController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class})
class ReceivableControllerTest {

	private static final String URL = "/receivables/overdue";

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private ReceivableService receivableService;

	@MockBean
	private AccessDeniedAuditRecorder accessDeniedAuditRecorder;

	@MockBean
	private JwtProvider jwtProvider;

	@MockBean
	private CustomUserDetailsService customUserDetailsService;

	@Test
	@DisplayName("TC-01: Ke toan xem hoa don qua han 40 ngay trong nhom 31-60 ngay")
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsOverdueInvoicesGroupedByAge() throws Exception {
		when(receivableService.getOverdue(null, null)).thenReturn(withOneInvoiceOverdueFortyDays());

		mockMvc.perform(get(URL))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.message").doesNotExist())
				.andExpect(jsonPath("$.data.totalInvoiceCount").value(1))
				.andExpect(jsonPath("$.data.totalRemainingAmount").value(60000000.00))
				.andExpect(jsonPath("$.data.buckets[1].bucket").value("DAYS_31_60"))
				.andExpect(jsonPath("$.data.buckets[1].invoices[0].invoiceCode").value("INV-9"))
				.andExpect(jsonPath("$.data.buckets[1].invoices[0].daysOverdue").value(40))
				.andExpect(jsonPath("$.data.buckets[1].invoices[0].customerName").value("Cong ty A"));
	}

	@Test
	@DisplayName("TC-02: khong co cong no qua han -> 200 kem thong bao va bon nhom rong")
	@WithMockUser(authorities = "ROLE_VT-05")
	void returnsMessageWhenNothingIsOverdue() throws Exception {
		when(receivableService.getOverdue(null, null)).thenReturn(empty());

		mockMvc.perform(get(URL))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.message").value("Khong co cong no qua han"))
				.andExpect(jsonPath("$.data.totalInvoiceCount").value(0))
				.andExpect(jsonPath("$.data.buckets.length()").value(4));
	}

	@Test
	@DisplayName("TC-03: vai tro khac Ke toan bi 403 va ghi nhat ky tu choi")
	@WithMockUser(authorities = "ROLE_VT-02")
	void deniesOtherRolesAndLogsDeniedAccess() throws Exception {
		mockMvc.perform(get(URL))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));

		verify(accessDeniedAuditRecorder).record(eq("GET"), contains("/receivables"));
		verify(receivableService, never()).getOverdue(any(), any());
	}

	@Test
	void rejectsRequestWithoutAuthentication() throws Exception {
		mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());

		verify(receivableService, never()).getOverdue(any(), any());
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void passesCustomerAndBucketFilters() throws Exception {
		when(receivableService.getOverdue(3L, AgingBucket.OVER_90)).thenReturn(empty());

		mockMvc.perform(get(URL).param("customerId", "3").param("bucket", "OVER_90"))
				.andExpect(status().isOk());

		verify(receivableService).getOverdue(3L, AgingBucket.OVER_90);
	}

	@Test
	@WithMockUser(authorities = "ROLE_VT-05")
	void rejectsUnknownBucketWith400() throws Exception {
		mockMvc.perform(get(URL).param("bucket", "OVER_9000"))
				.andExpect(status().isBadRequest());

		verify(receivableService, never()).getOverdue(any(), isNull());
	}

	private ReceivableAgingRes empty() {
		List<BucketRes> buckets = new ArrayList<>();
		for (AgingBucket bucket : AgingBucket.values()) {
			buckets.add(new BucketRes(bucket.name(), bucket.getLabel(), bucket.getFromDays(), bucket.getToDays(),
					0, BigDecimal.ZERO, List.of()));
		}
		return new ReceivableAgingRes(LocalDate.of(2026, 9, 21), 0, BigDecimal.ZERO, buckets);
	}

	private ReceivableAgingRes withOneInvoiceOverdueFortyDays() {
		ItemRes item = new ItemRes(9L, "INV-9", 5L, "HD-TEST", 3L, "Cong ty A", "PARTIALLY_PAID",
				new BigDecimal("100000000.00"), new BigDecimal("40000000.00"), new BigDecimal("60000000.00"),
				LocalDate.of(2026, 7, 13), LocalDate.of(2026, 8, 12), 40);
		List<BucketRes> buckets = new ArrayList<>();
		for (AgingBucket bucket : AgingBucket.values()) {
			boolean hit = bucket == AgingBucket.DAYS_31_60;
			buckets.add(new BucketRes(bucket.name(), bucket.getLabel(), bucket.getFromDays(), bucket.getToDays(),
					hit ? 1 : 0, hit ? item.remainingAmount() : BigDecimal.ZERO, hit ? List.of(item) : List.of()));
		}
		return new ReceivableAgingRes(LocalDate.of(2026, 9, 21), 1, item.remainingAmount(), buckets);
	}
}
