package com.serviceops.modules.invoice.service;

import com.serviceops.modules.invoice.dto.response.InvoiceDetailRes;
import com.serviceops.modules.invoice.dto.response.PaymentItemRes;
import com.serviceops.modules.invoice.enums.InvoiceStatus;

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
