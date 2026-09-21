package com.serviceops.modules.invoice;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.dto.response.PaymentItemRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.Payment;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.enums.PaymentMethod;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.PaymentRepository;
import com.serviceops.modules.invoice.service.impl.InvoiceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Tra cuu hoa don va lich su thanh toan (NCL-10-CN-003) — chi doc. */
@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

	@Mock
	private InvoiceRepository invoiceRepository;
	@Mock
	private PaymentRepository paymentRepository;
	@Mock
	private ContractRepository contractRepository;
	@Mock
	private CustomerRepository customerRepository;

	private InvoiceServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new InvoiceServiceImpl(invoiceRepository, paymentRepository, contractRepository,
				customerRepository);
	}

	@Test
	void listsInvoicesWithPaidRemainingContractCodeAndCustomerName() {
		Invoice partial = invoice(9L, InvoiceStatus.PARTIALLY_PAID, "100000000.00");
		Invoice untouched = invoice(8L, InvoiceStatus.ISSUED, "50000000.00");
		when(invoiceRepository.search(eq(5L), any())).thenReturn(List.of(partial, untouched));
		when(paymentRepository.sumAmountByInvoiceIdIn(any()))
				.thenReturn(List.<Object[]>of(new Object[] {9L, new BigDecimal("60000000.00")}));
		stubContractAndCustomer();

		List<InvoiceDetailRes> res = service.list(5L, List.of(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID));

		assertThat(res).hasSize(2);
		InvoiceDetailRes first = res.get(0);
		assertThat(first.paidAmount()).isEqualByComparingTo("60000000.00");
		assertThat(first.remainingAmount()).isEqualByComparingTo("40000000.00");
		assertThat(first.status()).isEqualTo("PARTIALLY_PAID");
		assertThat(first.contractCode()).isEqualTo("HD-TEST");
		assertThat(first.customerName()).isEqualTo("Cong ty A");
		InvoiceDetailRes second = res.get(1);
		assertThat(second.paidAmount()).isEqualByComparingTo("0");
		assertThat(second.remainingAmount()).isEqualByComparingTo("50000000.00");
	}

	@Test
	void treatsMissingOrEmptyStatusFilterAsAllStatuses() {
		when(invoiceRepository.search(any(), any())).thenReturn(List.of());

		assertThat(service.list(null, null)).isEmpty();
		assertThat(service.list(null, List.of())).isEmpty();

		@SuppressWarnings("unchecked")
		ArgumentCaptor<Collection<InvoiceStatus>> statuses = ArgumentCaptor.forClass(Collection.class);
		verify(invoiceRepository, org.mockito.Mockito.times(2)).search(eq(null), statuses.capture());
		assertThat(statuses.getAllValues()).allSatisfy(s -> assertThat(s).containsExactlyInAnyOrder(InvoiceStatus.values()));
		verify(paymentRepository, never()).sumAmountByInvoiceIdIn(any());
	}

	@Test
	void getsSingleInvoiceOrReturnsNotFound() {
		when(invoiceRepository.findById(9L)).thenReturn(Optional.of(invoice(9L, InvoiceStatus.ISSUED, "100000000.00")));
		when(paymentRepository.sumAmountByInvoiceIdIn(any())).thenReturn(List.of());
		stubContractAndCustomer();

		InvoiceDetailRes res = service.get(9L);

		assertThat(res.remainingAmount()).isEqualByComparingTo("100000000.00");

		when(invoiceRepository.findById(99L)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> service.get(99L))
				.isInstanceOfSatisfying(BusinessRuleException.class,
						ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
	}

	@Test
	void listsPaymentHistoryOrReturnsNotFoundForUnknownInvoice() {
		when(invoiceRepository.findById(9L)).thenReturn(Optional.of(invoice(9L, InvoiceStatus.PAID, "100000000.00")));
		Payment payment = new Payment();
		payment.setId(500L);
		payment.setAmount(new BigDecimal("100000000.00"));
		payment.setPaymentDate(LocalDate.of(2026, 9, 20));
		payment.setMethod(PaymentMethod.CASH);
		payment.setCreatedBy("ketoan01");
		payment.setCreatedAt(LocalDateTime.of(2026, 9, 20, 10, 0));
		when(paymentRepository.findByInvoiceIdOrderByPaymentDateDescIdDesc(9L)).thenReturn(List.of(payment));

		List<PaymentItemRes> res = service.listPayments(9L);

		assertThat(res).singleElement().satisfies(item -> {
			assertThat(item.method()).isEqualTo("CASH");
			assertThat(item.amount()).isEqualByComparingTo("100000000.00");
		});

		when(invoiceRepository.findById(99L)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> service.listPayments(99L)).isInstanceOf(BusinessRuleException.class);
		verify(paymentRepository, never()).findByInvoiceIdOrderByPaymentDateDescIdDesc(99L);
	}

	private void stubContractAndCustomer() {
		Contract contract = new Contract();
		contract.setId(5L);
		contract.setContractCode("HD-TEST");
		Customer customer = new Customer();
		customer.setId(3L);
		customer.setName("Cong ty A");
		when(contractRepository.findAllById(any())).thenReturn(List.of(contract));
		when(customerRepository.findAllById(any())).thenReturn(List.of(customer));
	}

	private Invoice invoice(Long id, InvoiceStatus status, String total) {
		Invoice invoice = new Invoice();
		invoice.setId(id);
		invoice.setInvoiceCode("INV-" + id);
		invoice.setContractId(5L);
		invoice.setCustomerId(3L);
		invoice.setStatus(status);
		invoice.setTotalAmount(new BigDecimal(total));
		invoice.setInvoiceDate(LocalDate.of(2026, 9, 21));
		return invoice;
	}
}
