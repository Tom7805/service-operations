package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.request.ContractCreateFromOpportunityReq;
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
}