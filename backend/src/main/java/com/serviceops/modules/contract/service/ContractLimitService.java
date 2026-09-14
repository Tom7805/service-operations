package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.response.ContractUsageRes;

/**
 * NCL-04-CN-005: Canh bao khi sap vuot han muc hop dong (QTN-19).
 */
public interface ContractLimitService {

	/**
	 * Tinh muc do da su dung han muc tran cua mot hop dong, dung lam cang cu
	 * hien thi canh bao cho Quan ly du an khi gan cham nguong (TC-01) hoac
	 * chan xuat hoa don khi da vuot (TC-02).
	 */
	ContractUsageRes getUsage(Long contractId);
}
