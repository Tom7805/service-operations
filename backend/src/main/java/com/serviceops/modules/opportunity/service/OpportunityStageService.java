package com.serviceops.modules.opportunity.service;

import com.serviceops.modules.opportunity.dto.request.StageChangeReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.dto.response.StageHistoryRes;

import java.util.List;

public interface OpportunityStageService {

	/**
	 * Chuyen giai doan cua mot co hoi (NCL-03-CN-002).
	 *
	 * <p>Kiem soat: chuyen theo dung thu tu giai doan (QTN-06, TC-02), khong cho
	 * mo lai co hoi da dong (TC-03), cap nhat xac suat tuong ung giai doan moi
	 * (TC-01) va ghi lich su chuyen giai doan (TC-05).</p>
	 *
	 * @param request Id co hoi + giai doan dich.
	 * @return co hoi sau khi chuyen giai doan (kem xac suat moi).
	 */
	OpportunityRes changeStage(StageChangeReq request);

	/**
	 * Lay lich su chuyen giai doan cua mot co hoi (TC-05).
	 */
	List<StageHistoryRes> history(Long opportunityId);
}
