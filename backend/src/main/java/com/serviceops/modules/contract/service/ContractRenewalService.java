package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.request.RenewalCreateReq;
import com.serviceops.modules.contract.dto.response.RenewalRes;

import java.util.List;

/**
 * NCL-04-CN-007: Gia han hop dong.
 */
public interface ContractRenewalService {

	/**
	 * Gia han mot hop dong dang hieu luc (TC-01): cap nhat ngay ket thuc moi va
	 * cong them gia tri bo sung neu co, giu lai ban ghi lich su gia han.
	 * Tu choi khi hop dong da dong (COMPLETED/TERMINATED) - TC-02.
	 */
	RenewalRes create(Long contractId, RenewalCreateReq request);

	/** Lich su cac lan gia han cua mot hop dong, moi nhat truoc. */
	List<RenewalRes> list(Long contractId);
}
