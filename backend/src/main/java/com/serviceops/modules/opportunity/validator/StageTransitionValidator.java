package com.serviceops.modules.opportunity.validator;

import com.serviceops.modules.opportunity.enums.OpportunityStage;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

/**
 * Kiem tra chuyen giai doan co hoi theo dung thu tu (QTN-06).
 *
 * <p>Giai doan chi duoc chuyen TIEP MOT BUOC lien ke theo thu tu
 * APPROACH -> SURVEY -> PROPOSAL -> NEGOTIATION — khong duoc nhay coc hay lui lai.
 * Hai ket qua cuoi:</p>
 * <ul>
 *   <li>{@link OpportunityStage#LOST} — QTN-06 cho chuyen khi "giai doan dich la lien ke
 *       hoac la thua", nen co hoi o BAT KY giai doan dang mo nao cung duoc chot thua.</li>
 *   <li>{@link OpportunityStage#WON} — chi tu {@link OpportunityStage#NEGOTIATION}
 *       (giai doan hoat dong cuoi cung, lien ke voi ket qua).</li>
 * </ul>
 *
 * <p>Day cung la noi DUY NHAT dinh nghia xac suat cua tung giai doan (NCL-03-CN-002 TC-01,
 * QTN-07) — tao co hoi, chuyen giai doan va dong co hoi deu doc tu day.</p>
 */
@Component
public class StageTransitionValidator {

	/** Cac giai doan con "dang hoat dong" (chua chot), theo dung thu tu chuyen tiep. */
	private static final List<OpportunityStage> ACTIVE_ORDER = List.of(
			OpportunityStage.APPROACH,
			OpportunityStage.SURVEY,
			OpportunityStage.PROPOSAL,
			OpportunityStage.NEGOTIATION);

	/** Giai doan khoi tao khi tao co hoi moi (NCL-03-CN-001, TC-01). */
	public OpportunityStage initialStage() {
		return OpportunityStage.APPROACH;
	}

	/** Xac suat cua giai doan khoi tao (NCL-03-CN-001, TC-01). */
	public BigDecimal initialProbability() {
		return probabilityFor(initialStage());
	}

	/** Xac suat thanh cong tuong ung voi tung giai doan (NCL-03-CN-002 TC-01, QTN-07). */
	public BigDecimal probabilityFor(OpportunityStage stage) {
		if (stage == null) {
			return BigDecimal.ZERO;
		}
		return switch (stage) {
			case APPROACH -> new BigDecimal("10");
			case SURVEY -> new BigDecimal("25");
			case PROPOSAL -> new BigDecimal("40");
			case NEGOTIATION -> new BigDecimal("70");
			case WON -> new BigDecimal("100");
			case LOST -> BigDecimal.ZERO;
		};
	}

	/** Giai doan con dang mo (chua chot thang/thua). */
	public boolean isActive(OpportunityStage stage) {
		return ACTIVE_ORDER.contains(stage);
	}

	/**
	 * Giai doan hoat dong ke tiep hop le cua {@code current} (dung cho thong bao TC-02);
	 * {@code null} neu current da la giai doan hoat dong cuoi hoac da chot.
	 */
	public OpportunityStage nextActiveStage(OpportunityStage current) {
		int idx = ACTIVE_ORDER.indexOf(current);
		return idx >= 0 && idx + 1 < ACTIVE_ORDER.size() ? ACTIVE_ORDER.get(idx + 1) : null;
	}

	/**
	 * Cho phep chuyen tu {@code current} sang {@code target} khi target la giai doan hoat
	 * dong KE TIEP LIEN KE, hoac target la LOST (tu bat ky giai doan dang mo nao), hoac
	 * target la WON va current la NEGOTIATION (TC-02, QTN-06). Khong cho phep chuyen lui,
	 * nhay coc, hay chuyen tiep tu mot giai doan da chot (WON/LOST).
	 */
	public boolean canTransition(OpportunityStage current, OpportunityStage target) {
		if (current == null || target == null) {
			return false;
		}
		int currentIndex = ACTIVE_ORDER.indexOf(current);
		if (currentIndex < 0) {
			// current da la giai doan chot (WON/LOST) - khong the chuyen tiep.
			return false;
		}
		if (current == target) {
			return true;
		}
		if (target == OpportunityStage.LOST) {
			return true;
		}
		if (target == OpportunityStage.WON) {
			return current == OpportunityStage.NEGOTIATION;
		}
		return ACTIVE_ORDER.indexOf(target) == currentIndex + 1;
	}
}
