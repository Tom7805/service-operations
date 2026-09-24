package com.serviceops.modules.invoice.service;

import com.serviceops.modules.invoice.dto.request.InvoiceFromProposalReq;
import com.serviceops.modules.invoice.dto.request.InvoiceProposalCreateReq;
import com.serviceops.modules.invoice.dto.response.InvoiceProposalRes;
import com.serviceops.modules.invoice.dto.response.InvoiceRes;

import java.util.List;

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

	/** Toan bo de nghi xuat hoa don (moi trang thai) cua mot hop dong, moi nhat truoc. */
	List<InvoiceProposalRes> listByContract(Long contractId);

	/**
	 * Chuyen mot de nghi dang PENDING thanh hoa don chinh thuc — moi dong cua de nghi (gio cong + chi phi)
	 * thanh mot dong hoa don. Chi goi duoc mot lan cho moi de nghi (chuyen sang INVOICED sau khi thanh cong).
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException
	 *         RESOURCE_NOT_FOUND neu khong co de nghi; INVALID_STATE neu de nghi khong con PENDING (da lap
	 *         hoa don hoac da huy); VALIDATION_ERROR neu vuot gia tri/han muc hop dong (QTN-19)
	 */
	InvoiceRes convertToInvoice(Long proposalId, InvoiceFromProposalReq request);

	/**
	 * Huy mot de nghi dang PENDING (vd tao nham, hoac muon gom lai chung voi de nghi khac cho gon thanh
	 * mot hoa don duy nhat). Giai phong toan bo dong gio cong/chi phi cua de nghi nay (xoa cac dong,
	 * voi rieng phieu chi phi thi dat lai {@code invoiced=false}) de lan tao de nghi sau gom lai duoc,
	 * dung nhu {@link InvoiceProposalService} da mo ta o {@code ProposalStatus.CANCELLED}.
	 *
	 * @throws com.serviceops.common.exception.BusinessRuleException
	 *         RESOURCE_NOT_FOUND neu khong co de nghi; INVALID_STATE neu de nghi khong con PENDING
	 */
	InvoiceProposalRes cancelProposal(Long proposalId);
}
