package com.serviceops.modules.invoice.service;

import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.dto.response.PaymentItemRes;
import com.serviceops.modules.invoice.enums.InvoiceStatus;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/** Tra cuu hoa don va lich su thanh toan (NCL-10-CN-003) — chi doc, khong doi du lieu. */
public interface InvoiceService {

	/**
	 * Danh sach hoa don kem so da thu / con lai, moi nhat truoc.
	 *
	 * @param contractId chi lay hoa don cua hop dong nay; {@code null} = moi hop dong
	 * @param statuses   chi lay cac trang thai nay; {@code null} hoac rong = moi trang thai
	 */
	List<InvoiceDetailRes> list(Long contractId, Collection<InvoiceStatus> statuses);

	/**
	 * Hoa don da qua han thanh toan tai {@code today} (NCL-10-CN-004): dang phat hanh hoac thanh toan mot phan,
	 * han thanh toan truoc {@code today} va con so phai thu &gt; 0; qua han lau nhat truoc.
	 *
	 * @param customerId chi lay hoa don cua khach hang nay; {@code null} = moi khach hang
	 */
	List<InvoiceDetailRes> listOverdue(LocalDate today, Long customerId);

	/**
	 * @throws com.serviceops.common.exception.BusinessRuleException RESOURCE_NOT_FOUND neu khong co hoa don
	 */
	InvoiceDetailRes get(Long invoiceId);

	/**
	 * Lich su thanh toan cua mot hoa don, ngay thanh toan moi nhat truoc.
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException RESOURCE_NOT_FOUND neu khong co hoa don
	 */
	List<PaymentItemRes> listPayments(Long invoiceId);
}
