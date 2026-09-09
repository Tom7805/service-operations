package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.request.ContractCreateFromOpportunityReq;
import com.serviceops.modules.contract.dto.request.ContractTypeLimitReq;
import com.serviceops.modules.contract.dto.response.ContractRes;

/**
 * Nghiep vu hop dong (NCL-04). Buoc dau tien phuc vu story tao hop dong tu
 * co hoi da thang (NCL-04-CN-001); cac nghiep vu khac (sua doi, giai doan
 * thanh toan, gia han) thuoc cac story sau.
 */
public interface ContractService {

	/**
	 * Tao hop dong tu mot co hoi da thang (NCL-04-CN-001, QTN-08).
	 *
	 * <p>He thong dung san hop dong tu khach hang, gia tri va bao gia moi nhat
	 * cua co hoi; nguoi dung bo sung cac thong tin con lai qua {@code request}.
	 * Hop dong moi luon o trang thai DRAFT va duoc lien ket nguoc ve co hoi.</p>
	 *
	 * @param opportunityId id co hoi da thang, phai co bao gia va chua co hop dong
	 * @param request       thong tin bo sung cua nguoi dung (ten, loai, ngay, ghi chu)
	 * @return hop dong vua tao
	 * @throws com.serviceops.common.exception.BusinessRuleException
	 *         RESOURCE_NOT_FOUND neu khong ton tai co hoi; INVALID_STATE neu co hoi
	 *         chua thang, da co hop dong, hoac ngay khong hop le; VALIDATION_ERROR
	 *         neu co hoi chua co bao gia
	 */
	ContractRes createFromOpportunity(Long opportunityId, ContractCreateFromOpportunityReq request);

	/**
	 * Xem chi tiet mot hop dong (phuc vu man hinh khai bao loai/han muc can doc
	 * gia tri hien tai truoc khi sua - NCL-04-CN-002).
	 *
	 * @param contractId id hop dong
	 * @return hop dong tuong ung
	 * @throws com.serviceops.common.exception.BusinessRuleException
	 *         RESOURCE_NOT_FOUND neu khong ton tai hop dong
	 */
	ContractRes getById(Long contractId);

	/**
	 * Khai bao loai hop dong, gia tri va han muc tran (NCL-04-CN-002, QTN-19).
	 *
	 * <p>Ke toan (VT-05) chon loai hop dong (tron goi/theo gio/theo moc), co the
	 * dieu chinh gia tri va nhap han muc tran neu co. Han muc (khi co gia tri)
	 * phai khong nho hon gia tri hop dong de dam bao khong xuat hoa don vuot muc
	 * tran (TC-02). Moi khai bao thanh cong duoc ghi nhat ky hop dong (TC-04).</p>
	 *
	 * @param contractId id hop dong da tao (dieu kien bat dau cua story)
	 * @param request    loai hop dong + gia tri dieu chinh (null = giu nguyen) + han muc (null = khong dat)
	 * @return hop dong sau khi cap nhat
	 * @throws com.serviceops.common.exception.BusinessRuleException
	 *         RESOURCE_NOT_FOUND neu khong ton tai hop dong; VALIDATION_ERROR neu
	 *         han muc khong hop le (am hoac nho hon gia tri hop dong)
	 */
	ContractRes updateTypeAndLimit(Long contractId, ContractTypeLimitReq request);

	/**
	 * Kich hoat hop dong: chuyen tu DRAFT sang ACTIVE sau khi Ke toan da khai
	 * bao xong loai hop dong va han muc (NCL-04-CN-002). Day la buoc bat buoc
	 * truoc khi hop dong co the dung cac nghiep vu chi danh cho hop dong dang
	 * hieu luc: lap phu luc dieu chinh (NCL-04-CN-004) va gia han (NCL-04-CN-007).
	 *
	 * @param contractId id hop dong dang DRAFT
	 * @return hop dong sau khi kich hoat
	 * @throws com.serviceops.common.exception.BusinessRuleException
	 *         RESOURCE_NOT_FOUND neu khong ton tai hop dong; INVALID_STATE neu
	 *         hop dong khong con o trang thai DRAFT (da kich hoat hoac da dong)
	 */
	ContractRes activate(Long contractId);
}