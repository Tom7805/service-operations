package com.serviceops.modules.opportunity.service;

import com.serviceops.modules.opportunity.dto.request.OpportunityCloseReq;
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

	/**
	 * Ghi nhan ket qua thang/thua khi dong mot co hoi (NCL-03-CN-005).
	 *
	 * <p>Dieu kien bat dau: co hoi dang o giai doan {@code NEGOTIATION} — kiem soat
	 * qua cung co che thu tu giai doan voi {@link #changeStage} (QTN-06): chi tu
	 * NEGOTIATION moi duoc chot sang WON/LOST, sai giai doan hoac co hoi da dong deu
	 * bi tu choi voi {@code INVALID_STATE}. Ket qua {@code LOST} bat buoc phai co ly
	 * do (TC-02) — thieu ly do bi tu choi voi {@code VALIDATION_ERROR}. Sau khi dong,
	 * lich su chuyen giai doan van duoc ghi (giong {@link #changeStage}) va thao tac
	 * duoc ghi nhat ky rieng {@code CLOSE_WON}/{@code CLOSE_LOST} (TC-04).</p>
	 *
	 * @param opportunityId Id co hoi can dong.
	 * @param request Ket qua (WON/LOST), ly do thua, ghi chu chi tiet va doi thu canh
	 *                tranh neu co.
	 * @return co hoi sau khi dong, kem ket qua va ly do da luu de phuc vu bao cao.
	 */
	OpportunityRes closeOpportunity(Long opportunityId, OpportunityCloseReq request);
}
