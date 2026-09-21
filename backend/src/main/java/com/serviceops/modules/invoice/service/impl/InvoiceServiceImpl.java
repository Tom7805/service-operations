package com.serviceops.modules.invoice.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.dto.response.PaymentItemRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.PaymentRepository;
import com.serviceops.modules.invoice.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InvoiceServiceImpl implements InvoiceService {

	private final InvoiceRepository invoiceRepository;
	private final PaymentRepository paymentRepository;
	private final ContractRepository contractRepository;
	private final CustomerRepository customerRepository;

	@Override
	public List<InvoiceDetailRes> list(Long contractId, Collection<InvoiceStatus> statuses) {
		Collection<InvoiceStatus> filter = statuses == null || statuses.isEmpty()
				? EnumSet.allOf(InvoiceStatus.class)
				: statuses;
		return toResponses(invoiceRepository.search(contractId, filter));
	}

	@Override
	public InvoiceDetailRes get(Long invoiceId) {
		return toResponses(List.of(requireInvoice(invoiceId))).get(0);
	}

	@Override
	public List<PaymentItemRes> listPayments(Long invoiceId) {
		requireInvoice(invoiceId);
		return paymentRepository.findByInvoiceIdOrderByPaymentDateDescIdDesc(invoiceId).stream()
				.map(p -> new PaymentItemRes(p.getId(), p.getAmount(), p.getPaymentDate(), p.getMethod().name(),
						p.getNote(), p.getCreatedBy(), p.getCreatedAt()))
				.toList();
	}

	private Invoice requireInvoice(Long invoiceId) {
		return invoiceRepository.findById(invoiceId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hoa don voi id=" + invoiceId));
	}

	/** Gom so da thu, ma hop dong va ten khach hang bang truy van theo lo (khong N+1). */
	private List<InvoiceDetailRes> toResponses(List<Invoice> invoices) {
		if (invoices.isEmpty()) {
			return List.of();
		}
		Map<Long, BigDecimal> paidByInvoice = new HashMap<>();
		for (Object[] row : paymentRepository.sumAmountByInvoiceIdIn(
				invoices.stream().map(Invoice::getId).toList())) {
			paidByInvoice.put((Long) row[0], (BigDecimal) row[1]);
		}
		Map<Long, Contract> contracts = contractRepository
				.findAllById(invoices.stream().map(Invoice::getContractId).distinct().toList()).stream()
				.collect(Collectors.toMap(Contract::getId, Function.identity()));
		Map<Long, Customer> customers = customerRepository
				.findAllById(invoices.stream().map(Invoice::getCustomerId).distinct().toList()).stream()
				.collect(Collectors.toMap(Customer::getId, Function.identity()));

		return invoices.stream().map(invoice -> {
			BigDecimal total = invoice.getTotalAmount().setScale(2, RoundingMode.HALF_UP);
			BigDecimal paid = paidByInvoice.getOrDefault(invoice.getId(), BigDecimal.ZERO)
					.setScale(2, RoundingMode.HALF_UP);
			Contract contract = contracts.get(invoice.getContractId());
			Customer customer = customers.get(invoice.getCustomerId());
			return new InvoiceDetailRes(invoice.getId(), invoice.getInvoiceCode(), invoice.getContractId(),
					contract == null ? null : contract.getContractCode(), invoice.getCustomerId(),
					customer == null ? null : customer.getName(), invoice.getStatus().name(), total, paid,
					total.subtract(paid), invoice.getInvoiceDate(), invoice.getNote(), invoice.getCreatedBy(),
					invoice.getCreatedAt());
		}).toList();
	}
}
