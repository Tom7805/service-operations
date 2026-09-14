package com.serviceops.modules.opportunity.validator;

import com.serviceops.modules.opportunity.enums.OpportunityStage;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Kiem tra chuyen giai doan co hoi theo dung thu tu (QTN-06).
 * Giai doan chi duoc chuyen TIEP MOT BUOC lien ke theo thu tu khai bao
 * (APPROACH -> PROPOSAL -> NEGOTIATION -> WON/LOST) — khong duoc nhay coc
 * (bo qua mot giai doan trung gian) hay lui lai. Tu {@link OpportunityStage#NEGOTIATION}
 * (giai doan hoat dong cuoi cung), co hoi co the chot sang WON hoac LOST — hai ket qua
 * cuoi ngang hang nhau, khong phai buoc noi tiep nhau.
 */
@Component
public class StageTransitionValidator {

	/** Cac giai doan con "dang hoat dong" (chua chot), theo dung thu tu chuyen tiep. */
	private static final List<OpportunityStage> ACTIVE_ORDER =
			List.of(OpportunityStage.APPROACH, OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION);

	/** Giai doan khoi tao khi tao co hoi moi (NCL-03-CN-001, TC-01). */
	public OpportunityStage initialStage() {
		return OpportunityStage.APPROACH;
	}

	/**
	 * Xac suat mac dinh cua giai doan khoi tao (NCL-03-CN-001, TC-01) — phai khop voi
	 * xac suat cua {@link OpportunityStage#APPROACH} o {@code OpportunityStageServiceImpl}.
	 * Truoc day OpportunityServiceImpl.create() khong goi ham nao ca nen truong probability
	 * bi de trong (null), khien giao dien hien "% xac suat" thay vi "10% xac suat".
	 */
	public BigDecimal initialProbability() {
		return new BigDecimal("10");
	}

	/**
	 * Cho phep chuyen tu {@code current} sang {@code target} chi khi target la giai doan
	 * hoat dong KE TIEP LIEN KE cua current, hoac (khi current la NEGOTIATION) target la
	 * WON/LOST (TC-02). Khong cho phep chuyen lui, nhay coc, hay chuyen tiep tu mot giai
	 * doan da chot (WON/LOST).
	 */
	public boolean canTransition(OpportunityStage current, OpportunityStage target) {
		if (current == null || target == null) {
			return false;
		}
		if (current == target) {
			return true;
		}
		int currentIndex = ACTIVE_ORDER.indexOf(current);
		if (currentIndex < 0) {
			// current da la giai doan chot (WON/LOST) - khong the chuyen tiep.
			return false;
		}
		boolean isLastActiveStage = currentIndex == ACTIVE_ORDER.size() - 1;
		if (isLastActiveStage && (target == OpportunityStage.WON || target == OpportunityStage.LOST)) {
			return true;
		}
		int targetIndex = ACTIVE_ORDER.indexOf(target);
		return targetIndex == currentIndex + 1;
	}
}
