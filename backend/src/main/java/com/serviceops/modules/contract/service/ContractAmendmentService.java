package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.request.AmendmentCreateReq;
import com.serviceops.modules.contract.dto.response.AmendmentRes;

import java.util.List;

/**
 * Nghiep vu lap phu luc dieu chinh hop dong (NCL-04-CN-004).
 */
public interface ContractAmendmentService {

	/** Lap mot phu luc moi cho hop dong va ap dung dieu chinh len hop dong (TC-01/02/04). */
	AmendmentRes create(Long contractId, AmendmentCreateReq request);

	/** Lich su phu luc cua hop dong, moi lap gan nhat hien truoc. */
	List<AmendmentRes> list(Long contractId);
}
