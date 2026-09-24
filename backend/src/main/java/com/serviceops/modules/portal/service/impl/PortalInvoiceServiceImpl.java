package com.serviceops.modules.portal.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.repository.ContractRepository;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceLineRepository;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.PaymentRepository;
import com.serviceops.modules.portal.dto.response.PortalDebtSummaryRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceDetailRes;
import com.serviceops.modules.portal.dto.response.PortalInvoiceRes;
import com.serviceops.modules.portal.mapper.PortalMapper;
import com.serviceops.modules.portal.security.PortalDataScopeGuard;
import com.serviceops.modules.portal.security.PortalDataScopeGuard.PortalScope;
import com.serviceops.modules.portal.service.PortalInvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * NCL-13-CN-004: hoa don va cong no tren cong khach hang.
 *
 * <ul>
 *   <li>TC-01: hoa don cua chinh khach hang kem so con phai tra va han thanh toan; hoa don nhap (DRAFT) chua
 *       phat hanh nen khong hien.</li>
 *   <li>TC-02: mo hoa don cua khach hang khac bang duong dan -&gt; 403 + nhat ky tu choi.</li>
 *   <li>TC-03: chi tai khoan cong (chan o controller va {@code SecurityConfig}).</li>
 *   <li>TC-04: moi luot xem danh sach/chi tiet ghi Nhat ky he thong (PORTAL).</li>
 * </ul>
 * So da tra/con lai/qua han tinh cung cach NCL-10-CN-003/004 (tong cac lan thanh toan).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortalInvoiceServiceImpl implements PortalInvoiceService {

	/** Hoa don da phat hanh cho khach hang; DRAFT la ban nhap noi bo cua ke toan. */
	static final Set<InvoiceStatus> VISIBLE_STATUSES = EnumSet.of(InvoiceStatus.ISSUED,
			InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.CANCELLED);

	/** Con phai thu (giong NCL-10-CN-004): chi cac trang thai nay moi co the qua han. */
	private static final Set<InvoiceStatus> RECEIVABLE_STATUSES = EnumSet.of(InvoiceStatus.ISSUED,
			InvoiceStatus.PARTIALLY_PAID);

	private final PortalDataScopeGuard scopeGuard;
	private final InvoiceRepository invoiceRepository;
	private final InvoiceLineRepository invoiceLineRepository;
	private final PaymentRepository paymentRepository;
	private final ContractRepository contractRepository;
	private final CustomerRepository customerRepository;
	private final PortalMapper mapper;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public List<PortalInvoiceRes> list(InvoiceStatus status, Boolean overdueOnly) {
		if (status == InvoiceStatus.DRAFT) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Trang thai loc chi nhan ISSUED, PARTIALLY_PAID, PAID hoac CANCELLED");
		}
		PortalScope scope = scopeGuard.currentScope();
		List<PortalInvoiceRes> result = loadInvoices(scope).stream()
				.filter(invoice -> status == null || invoice.status() == status)
				.filter(invoice -> !Boolean.TRUE.equals(overdueOnly) || invoice.overdue())
				.toList();
		auditLogService.record("Khách hàng xem hóa đơn và công nợ", AuditTargetType.PORTAL, scope.accountId(),
				"Cổng khách hàng " + scope.username(),
				"Khach hang " + scope.username() + " xem danh sach " + result.size() + " hoa don tren cong");
		return result;
	}

	@Override
	public PortalDebtSummaryRes summary() {
		PortalScope scope = scopeGuard.currentScope();
		List<PortalInvoiceRes> invoices = loadInvoices(scope).stream()
				.filter(invoice -> invoice.status() != InvoiceStatus.CANCELLED)
				.toList();
		LocalDate today = LocalDate.now(clock);
		BigDecimal totalInvoiced = sum(invoices.stream().map(PortalInvoiceRes::totalAmount).toList());
		BigDecimal totalPaid = sum(invoices.stream().map(PortalInvoiceRes::paidAmount).toList());
		BigDecimal totalOutstanding = sum(invoices.stream().map(PortalInvoiceRes::remainingAmount).toList());
		List<PortalInvoiceRes> overdue = invoices.stream().filter(PortalInvoiceRes::overdue).toList();
		LocalDate nextDueDate = invoices.stream()
				.filter(invoice -> invoice.remainingAmount().signum() > 0 && !invoice.dueDate().isBefore(today))
				.map(PortalInvoiceRes::dueDate)
				.min(LocalDate::compareTo)
				.orElse(null);
		BigDecimal nextDueAmount = nextDueDate == null ? null : sum(invoices.stream()
				.filter(invoice -> invoice.remainingAmount().signum() > 0 && nextDueDate.equals(invoice.dueDate()))
				.map(PortalInvoiceRes::remainingAmount).toList());
		Customer customer = customerRepository.findById(scope.customerId()).orElse(null);
		return new PortalDebtSummaryRes(scope.customerId(), customer == null ? null : customer.getCode(),
				customer == null ? null : customer.getName(), invoices.size(), totalInvoiced, totalPaid,
				totalOutstanding, overdue.size(), sum(overdue.stream().map(PortalInvoiceRes::remainingAmount).toList()),
				nextDueDate, nextDueAmount);
	}

	@Override
	public PortalInvoiceDetailRes get(Long invoiceId) {
		PortalScope scope = scopeGuard.currentScope();
		Invoice invoice = invoiceRepository.findById(invoiceId)
				.filter(value -> scope.owns(value.getCustomerId()) && VISIBLE_STATUSES.contains(value.getStatus()))
				.orElseThrow(() -> new AccessDeniedException("Hoa don khong thuoc khach hang cua tai khoan cong"));
		String contractCode = contractRepository.findById(invoice.getContractId())
				.map(Contract::getContractCode).orElse(null);
		PortalInvoiceRes summary = toPortalInvoice(invoice, contractCode,
				paymentRepository.sumAmountByInvoiceId(invoice.getId()), LocalDate.now(clock));
		PortalInvoiceDetailRes result = mapper.toPortalInvoiceDetail(summary,
				invoiceLineRepository.findByInvoiceIdOrderByIdAsc(invoice.getId()),
				paymentRepository.findByInvoiceIdOrderByPaymentDateDescIdDesc(invoice.getId()));
		auditLogService.record("Khách hàng xem hóa đơn và công nợ", AuditTargetType.PORTAL, invoice.getId(),
				"Hóa đơn " + invoice.getInvoiceCode(),
				"Khach hang " + scope.username() + " xem hoa don " + invoice.getInvoiceCode() + " tren cong");
		return result;
	}

	/** Hoa don cua khach hang kem so da tra — gom mot truy van tong thanh toan cho ca danh sach. */
	private List<PortalInvoiceRes> loadInvoices(PortalScope scope) {
		List<Invoice> invoices = invoiceRepository.findByCustomerIdInAndStatusInOrderByInvoiceDateDescIdDesc(
				scope.customerIds(), VISIBLE_STATUSES);
		if (invoices.isEmpty()) {
			return List.of();
		}
		Map<Long, BigDecimal> paidByInvoice = new HashMap<>();
		for (Object[] row : paymentRepository.sumAmountByInvoiceIdIn(invoices.stream().map(Invoice::getId).toList())) {
			paidByInvoice.put((Long) row[0], (BigDecimal) row[1]);
		}
		Map<Long, String> contractCodes = contractRepository.findAllById(invoices.stream()
						.map(Invoice::getContractId).filter(Objects::nonNull).distinct().toList()).stream()
				.collect(Collectors.toMap(Contract::getId, Contract::getContractCode));
		LocalDate today = LocalDate.now(clock);
		return invoices.stream()
				.map(invoice -> toPortalInvoice(invoice, contractCodes.get(invoice.getContractId()),
						paidByInvoice.getOrDefault(invoice.getId(), BigDecimal.ZERO), today))
				.toList();
	}

	private PortalInvoiceRes toPortalInvoice(Invoice invoice, String contractCode, BigDecimal paid, LocalDate today) {
		BigDecimal paidAmount = paid == null ? BigDecimal.ZERO : paid;
		BigDecimal remaining = invoice.getStatus() == InvoiceStatus.CANCELLED ? BigDecimal.ZERO
				: invoice.getTotalAmount().subtract(paidAmount).max(BigDecimal.ZERO);
		boolean overdue = RECEIVABLE_STATUSES.contains(invoice.getStatus()) && remaining.signum() > 0
				&& invoice.getDueDate() != null && invoice.getDueDate().isBefore(today);
		long daysOverdue = overdue ? ChronoUnit.DAYS.between(invoice.getDueDate(), today) : 0;
		return mapper.toPortalInvoice(invoice, contractCode, paidAmount, remaining, overdue, daysOverdue);
	}

	private static BigDecimal sum(List<BigDecimal> values) {
		return values.stream().filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
	}
}
