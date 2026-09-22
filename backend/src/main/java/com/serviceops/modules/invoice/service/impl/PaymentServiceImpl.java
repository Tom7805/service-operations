package com.serviceops.modules.invoice.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.invoice.dto.request.PaymentCreateReq;
import com.serviceops.modules.invoice.dto.response.PaymentRes;
import com.serviceops.modules.invoice.entity.Invoice;
import com.serviceops.modules.invoice.entity.Payment;
import com.serviceops.modules.invoice.enums.InvoiceStatus;
import com.serviceops.modules.invoice.repository.InvoiceRepository;
import com.serviceops.modules.invoice.repository.PaymentRepository;
import com.serviceops.modules.invoice.service.PaymentService;
import com.serviceops.modules.invoice.validator.PaymentAmountValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Ghi nhan thanh toan cua khach hang (NCL-10-CN-003).
 *
 * <p>Khoa ghi dong hoa don ngay tu dau de cac luot ghi thanh toan cua cung mot hoa don chay
 * tuan tu: cung khoa nay bao ve ca kiem tra trang thai lan kiem tra "khong vuot so con phai
 * thu", nen hai ke toan ghi cung luc khong the cung lam hoa don bi thu thua.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

	private final InvoiceRepository invoiceRepository;
	private final PaymentRepository paymentRepository;
	private final PaymentAmountValidator amountValidator;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	public PaymentRes recordPayment(Long invoiceId, PaymentCreateReq request) {
		Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay hoa don voi id=" + invoiceId));
		requirePayable(invoice);

		LocalDate today = LocalDate.now(clock);
		if (request.paymentDate().isAfter(today)) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ngay thanh toan khong duoc o tuong lai (hom nay " + today + ")");
		}

		BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
		BigDecimal total = invoice.getTotalAmount().setScale(2, RoundingMode.HALF_UP);
		BigDecimal paidBefore = paymentRepository.sumAmountByInvoiceId(invoiceId).setScale(2, RoundingMode.HALF_UP);
		amountValidator.validate(total.subtract(paidBefore), amount);

		LocalDateTime now = LocalDateTime.now(clock);
		Payment payment = new Payment();
		payment.setInvoiceId(invoiceId);
		payment.setAmount(amount);
		payment.setPaymentDate(request.paymentDate());
		payment.setMethod(request.method());
		payment.setNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
		payment.setCreatedBy(currentUsername());
		payment.setCreatedAt(now);
		payment = paymentRepository.save(payment);

		BigDecimal paidAfter = paidBefore.add(amount);
		BigDecimal remaining = total.subtract(paidAfter);
		InvoiceStatus statusBefore = invoice.getStatus();
		invoice.setStatus(remaining.signum() == 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID);
		invoice.setUpdatedAt(now);
		invoiceRepository.save(invoice);

		auditLogService.record("Ghi nhan thanh toan cua khach hang", AuditTargetType.INVOICE, invoice.getId(),
				invoice.getInvoiceCode(),
				"Ghi nhan thanh toan " + amount + " (" + payment.getMethod() + ", ngay " + payment.getPaymentDate()
						+ ") cho hoa don " + invoice.getInvoiceCode() + ": da thu " + paidBefore + " -> " + paidAfter
						+ ", con lai " + remaining + ", trang thai " + statusBefore + " -> " + invoice.getStatus());

		return new PaymentRes(payment.getId(), invoiceId, invoice.getInvoiceCode(), amount,
				payment.getPaymentDate(), payment.getMethod().name(), payment.getNote(), total, paidAfter,
				remaining, invoice.getStatus().name(), payment.getCreatedBy(), payment.getCreatedAt());
	}

	/** Chi hoa don da phat hanh va chua thu du moi nhan thanh toan. */
	private void requirePayable(Invoice invoice) {
		switch (invoice.getStatus()) {
			case ISSUED, PARTIALLY_PAID -> {
			}
			case DRAFT -> throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Hoa don " + invoice.getInvoiceCode()
							+ " con la ban nhap, chua phat hanh nen chua ghi nhan thanh toan");
			case PAID -> throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Hoa don " + invoice.getInvoiceCode() + " da duoc thanh toan du");
			case CANCELLED -> throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Hoa don " + invoice.getInvoiceCode() + " da bi huy");
		}
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
