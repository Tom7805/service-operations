package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.request.ContractUsageReq;
import com.serviceops.modules.contract.dto.response.ContractUsageRes;

/**
 * Nghiep vu theo doi han muc va canh bao khi sap vuot han muc hop dong (NCL-04-CN-005).
 */
public interface ContractLimitService {

	/** Tinh trang han muc va gia tri da dung hien tai cua hop dong. */
	ContractUsageRes getUsage(Long contractId);

	/** Ghi nhan them gia tri phat sinh (gio cong da duyet/hoa don) va tra ve tinh trang moi (TC-01/02/04). */
	ContractUsageRes recordUsage(Long contractId, ContractUsageReq request);
}
