package com.serviceops.modules.opportunity.validator;

import com.serviceops.modules.opportunity.enums.OpportunityStage;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Kiem tra chuyen giai doan co hoi theo dung thu tu (QTN-06).
 * Giai doan chi duoc chuyen TIEP theo thu tu khai bao trong {@link OpportunityStage}
 * (APPROACH -> PROPOSAL -> NEGOTIATION -> WON/LOST), khong duoc nhay coc hay lui lai.
 */
@Component
public class StageTransitionValidator {

	private static final List<OpportunityStage> ORDER =
			List.copyOf(Arrays.asList(OpportunityStage.values()));

	/** Giai doan khoi tao khi tao co hoi moi (NCL-03-CN-001, TC-01). */
	public OpportunityStage initialStage() {
		return OpportunityStage.APPROACH;
	}

	/**
	 * Cho phep chuyen tu {@code current} sang {@code target} chi khi target dung SAU
	 * current trong thu tu (QTN-06). Khong cho phep chuyen lui hay nhay qua terminal.
	 */
	public boolean canTransition(OpportunityStage current, OpportunityStage target) {
		if (current == null || target == null) {
			return false;
		}
		if (current == target) {
			return true;
		}
		return ORDER.indexOf(target) > ORDER.indexOf(current);
	}
}
