package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.request.MilestoneCreateReq;
import com.serviceops.modules.contract.dto.response.MilestoneRes;

import java.util.List;

/**
 * Nghiep vu quan ly moc thanh toan cua hop dong (NCL-04-CN-003).
 */
public interface ContractMilestoneService {

	/** Thay the toan bo danh sach moc thanh toan hien co cua hop dong (TC-01/TC-02/TC-04). */
	List<MilestoneRes> replaceMilestones(Long contractId, MilestoneCreateReq request);

	/** Danh sach moc thanh toan hien tai cua hop dong, theo dung thu tu hien thi. */
	List<MilestoneRes> list(Long contractId);
}
