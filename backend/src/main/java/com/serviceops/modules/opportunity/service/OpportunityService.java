package com.serviceops.modules.opportunity.service;

import com.serviceops.modules.opportunity.dto.request.OpportunityCreateReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;

public interface OpportunityService {

	/**
	 * Tao co hoi ban hang moi (NCL-03-CN-001, TC-01/TC-02/TC-04).
	 *
	 * @param request du lieu tao co hoi (ten, khach hang, gia tri du kien, ...).
	 * @return co hoi da luu, o giai doan dau tien (APPROACH).
	 */
	OpportunityRes create(OpportunityCreateReq request);
}
