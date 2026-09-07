package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;

import java.util.List;

/**
 * Nghiep vu nhac hop dong sap het hieu luc (NCL-04-CN-006).
 */
public interface ContractExpiryReminderService {

	/**
	 * Ra soat cac hop dong dang hieu luc sap het han trong vong ba muoi ngay
	 * toi, gui nhac (ghi nhat ky) cho hop dong chua duoc nhac trong ngay hom
	 * nay va tra ve danh sach da gui (TC-01, TC-04, QTN-27).
	 */
	List<ContractExpiryAlertRes> runReminderScan();

	/**
	 * Danh sach hop dong da het hieu luc nhung van o trang thai ACTIVE (chua
	 * duoc dong hoac gia han) - dau hieu du an dang chay ngoai hop dong (TC-02).
	 */
	List<ContractExpiryAlertRes> listOverdueActiveContracts();
}
