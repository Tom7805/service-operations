package com.serviceops.modules.invoice.service;

import com.serviceops.modules.invoice.dto.request.InvoiceFromMilestoneReq;
import com.serviceops.modules.invoice.dto.response.InvoiceRes;

public interface MilestoneInvoiceService {

	/**
	 * Lap hoa don cho mot moc thanh toan cua hop dong tron goi/theo moc (NCL-10-CN-002).
	 *
	 * <p>Hoa don co gia tri dung bang gia tri cua moc; moc chuyen sang {@code INVOICED}
	 * trong cung giao dich va thao tac duoc ghi Nhat ky he thong.</p>
	 *
	 * @param request tuy chon; {@code null} hoac bo trong thi dung ngay hom nay, khong ghi chu
	 * @throws com.serviceops.common.exception.BusinessRuleException
	 *         RESOURCE_NOT_FOUND neu khong co hop dong/moc (hoac moc khong thuoc hop dong);
	 *         INVALID_STATE neu loai hop dong khong phai FIXED_PRICE/MILESTONE hoac moc chua
	 *         du dieu kien / da xuat hoa don; VALIDATION_ERROR neu tong hoa don luy ke vuot
	 *         gia tri hop dong (QTN-19)
	 */
	InvoiceRes createFromMilestone(Long contractId, Long milestoneId, InvoiceFromMilestoneReq request);
}
