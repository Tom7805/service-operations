package com.serviceops.modules.invoice.service;

import com.serviceops.modules.invoice.dto.request.InvoiceProposalCreateReq;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalRes;

public interface InvoiceProposalService {

	/**
	 * Gom gio cong DA DUYET, co tinh phi va chua tung xuat hoa don cua mot du an trong mot ky (cung voi phieu chi
	 * phi da duyet duoc danh dau tinh lai cho khach hang) thanh mot de nghi xuat hoa don (NCL-10-CN-001, QTN-18).
	 *
	 * <p>Chi ap dung cho hop dong theo gio ({@code TIME_AND_MATERIAL}). Dong chua duyet, khong tinh phi, da nam
	 * trong de nghi khac hoac chua tra duoc don gia bi bo qua va duoc dem trong {@code skipped} cua ket qua;
	 * cac dong duoc gom duoc danh dau de khong vao de nghi thu hai. Thao tac ghi Nhat ky he thong va gui thong
	 * bao trong ung dung cho quan ly du an.</p>
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException
	 *         VALIDATION_ERROR neu thieu/sai khoang ngay; RESOURCE_NOT_FOUND neu khong co du an hoac hop dong;
	 *         INVALID_STATE neu hop dong khong phai TIME_AND_MATERIAL hoac khong co dong nao du dieu kien
	 */
	InvoiceProposalRes createFromApprovedTimesheets(Long projectId, InvoiceProposalCreateReq request);
}
