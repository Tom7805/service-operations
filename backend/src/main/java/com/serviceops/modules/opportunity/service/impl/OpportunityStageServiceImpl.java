package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.opportunity.dto.request.OpportunityCloseReq;
import com.serviceops.modules.opportunity.dto.request.StageChangeReq;
import com.serviceops.modules.opportunity.dto.response.OpportunityRes;
import com.serviceops.modules.opportunity.dto.response.StageHistoryRes;
import com.serviceops.modules.opportunity.entity.Opportunity;
import com.serviceops.modules.opportunity.entity.OpportunityStageHistory;
import com.serviceops.modules.opportunity.enums.LossReason;
import com.serviceops.modules.opportunity.enums.OpportunityAuditAction;
import com.serviceops.modules.opportunity.enums.OpportunityStage;
import com.serviceops.modules.opportunity.enums.OpportunityStatus;
import com.serviceops.modules.opportunity.logging.OpportunityAuditLogger;
import com.serviceops.modules.opportunity.mapper.OpportunityMapper;
import com.serviceops.modules.opportunity.repository.OpportunityRepository;
import com.serviceops.modules.opportunity.repository.OpportunityStageHistoryRepository;
import com.serviceops.modules.opportunity.service.OpportunityStageService;
import com.serviceops.modules.opportunity.validator.StageTransitionValidator;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * NCL-03-CN-002: Chuyen giai doan co hoi. NCL-03-CN-005: Ghi nhan ket qua thang/thua.
 *
 * <p>Kiem soat chuyen giai doan: (TC-01) cap nhat xac suat tuong ung giai doan moi;
 * (TC-02) chuyen theo dung thu tu (QTN-06), tu choi neu nhay coc va neu giai doan
 * hop le ke tiep; (TC-03) khong cho mo lai co hoi da dong (CLOSED); (TC-05) ghi lich
 * su moi lan chuyen.</p>
 *
 * <p>Kiem soat dong co hoi voi ket qua thang/thua ({@link #closeOpportunity}): dung
 * chung co che thu tu giai doan noi tren (chi tu NEGOTIATION moi duoc chot sang
 * WON/LOST) — dieu kien bat dau cua NCL-03-CN-005 la co hoi dang o giai doan dam
 * phan; ket qua LOST bat buoc phai co ly do (TC-02); moi lan dong deu duoc ghi lich
 * su chuyen giai doan va ghi nhat ky rieng {@code CLOSE_WON}/{@code CLOSE_LOST} (TC-04).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OpportunityStageServiceImpl implements OpportunityStageService {

	private final OpportunityRepository opportunityRepository;
	private final OpportunityStageHistoryRepository stageHistoryRepository;
	private final StageTransitionValidator stageTransitionValidator;
	private final OpportunityMapper opportunityMapper;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final OpportunityAuditLogger auditLogger;

	@Override
	public OpportunityRes changeStage(StageChangeReq request) {
		Opportunity opportunity = opportunityRepository.findById(request.opportunityId())
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay co hoi voi id=" + request.opportunityId()));

		OpportunityStage target = request.targetStage();

		// TC-03: khong mo lai co hoi da dong (thang/thua).
		if (opportunity.getStatus() == OpportunityStatus.CLOSED) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Co hoi da dong (thang hoac thua) - khong the mo lai");
		}

		OpportunityStage current = opportunity.getStage();

		// TC-02: chuyen theo dung thu tu (QTN-06), tu choi neu nhay coc / lui / khong hop le.
		if (!stageTransitionValidator.canTransition(current, target)) {
			String next = nextStageName(current);
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Giai doan khong hop le. Giai doan hien tai: " + current
							+ (next == null ? "" : " — giai doan hop le ke tiep: " + next)
							+ ". Giai doan dich: " + target);
		}

		// TC-01: cap nhat xac suat tuong ung.
		opportunity.setStage(target);
		opportunity.setProbability(probabilityFor(target));
		// TC-03: dat WON/LOST la giai doan chot - dong co hoi de khong the mo lai.
		if (target == OpportunityStage.WON || target == OpportunityStage.LOST) {
			opportunity.setStatus(OpportunityStatus.CLOSED);
		}
		opportunityRepository.save(opportunity);

		// TC-05: ghi lich su chuyen giai doan.
		recordHistory(opportunity.getId(), current, target);

		log.info("OPPORTUNITY_STAGE_CHANGED id={} {} -> {} by={}",
				opportunity.getId(), current, target, currentUserScopeProvider.currentUserId());

		return opportunityMapper.toResponse(opportunity, null);
	}

	@Override
	@Transactional(readOnly = true)
	public List<StageHistoryRes> history(Long opportunityId) {
		if (!opportunityRepository.existsById(opportunityId)) {
			throw new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
					"Khong tim thay co hoi voi id=" + opportunityId);
		}
		List<StageHistoryRes> result = new ArrayList<>();
		for (OpportunityStageHistory h : stageHistoryRepository.findByOpportunityIdOrderByChangedAtDesc(opportunityId)) {
			result.add(new StageHistoryRes(h.getId(), h.getOpportunityId(),
					h.getFromStage() == null ? null : h.getFromStage().name(),
					h.getToStage().name(),
					h.getChangedByUsername(), h.getChangedAt()));
		}
		return result;
	}

	@Override
	public OpportunityRes closeOpportunity(Long opportunityId, OpportunityCloseReq request) {
		Opportunity opportunity = opportunityRepository.findById(opportunityId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay co hoi voi id=" + opportunityId));

		OpportunityStage result = request.result();
		// Ket qua dong co hoi chi co the la WON hoac LOST (khong the "dong" o giai doan trung gian).
		if (result != OpportunityStage.WON && result != OpportunityStage.LOST) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ket qua dong co hoi chi duoc la WON hoac LOST");
		}

		// TC-02: ket qua LOST bat buoc phai co ly do truoc khi dong.
		if (result == OpportunityStage.LOST && request.lossReason() == null) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Phai chon ly do khi ghi nhan co hoi thua (LOST)");
		}

		// Dung chung dieu kien voi changeStage: khong mo lai co hoi da dong.
		if (opportunity.getStatus() == OpportunityStatus.CLOSED) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Co hoi da dong (thang hoac thua) - khong the mo lai");
		}

		OpportunityStage current = opportunity.getStage();

		// Dieu kien bat dau cua NCL-03-CN-005: chi duoc ghi nhan ket qua khi co hoi dang
		// o giai doan dam phan (NEGOTIATION) — StageTransitionValidator (QTN-06) chi cho
		// phep WON/LOST tiep noi tu NEGOTIATION nen tai su dung dung luat nay.
		if (!stageTransitionValidator.canTransition(current, result)) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi duoc ghi nhan ket qua thang/thua khi co hoi dang o giai doan dam phan (NEGOTIATION)."
							+ " Giai doan hien tai: " + current);
		}

		opportunity.setStage(result);
		opportunity.setStatus(OpportunityStatus.CLOSED);
		opportunity.setProbability(probabilityFor(result));
		opportunity.setLossReason(result == OpportunityStage.LOST ? request.lossReason() : null);
		opportunity.setCloseReasonDetail(trimToNull(request.reasonDetail()));
		opportunity.setCompetitorName(trimToNull(request.competitorName()));
		opportunity.setClosedAt(LocalDateTime.now());
		opportunityRepository.save(opportunity);

		// Dung chung nhat ky chuyen giai doan voi changeStage (van thay doi tu NEGOTIATION -> WON/LOST).
		recordHistory(opportunity.getId(), current, result);

		// TC-04: ghi nhat ky rieng cho ket qua dong co hoi, kem ly do/doi thu de phuc vu bao cao.
		auditLogger.recordClose(opportunity.getId(),
				result == OpportunityStage.WON ? OpportunityAuditAction.CLOSE_WON : OpportunityAuditAction.CLOSE_LOST,
				closeAuditDetail(result, opportunity.getLossReason(), opportunity.getCompetitorName()));

		log.info("OPPORTUNITY_CLOSED id={} result={} lossReason={} by={}",
				opportunity.getId(), result, opportunity.getLossReason(), currentUserScopeProvider.currentUserId());

		return opportunityMapper.toResponse(opportunity, null);
	}

	private String closeAuditDetail(OpportunityStage result, LossReason lossReason, String competitorName) {
		if (result == OpportunityStage.WON) {
			return "Dong co hoi voi ket qua THANG";
		}
		StringBuilder detail = new StringBuilder("Dong co hoi voi ket qua THUA - ly do: ").append(lossReason);
		if (competitorName != null) {
			detail.append("; doi thu: ").append(competitorName);
		}
		return detail.toString();
	}

	private String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private void recordHistory(Long opportunityId, OpportunityStage from, OpportunityStage to) {
		OpportunityStageHistory history = new OpportunityStageHistory();
		history.setOpportunityId(opportunityId);
		history.setFromStage(from);
		history.setToStage(to);
		history.setChangedBy(currentUserScopeProvider.currentUserId());
		history.setChangedByUsername(currentUsername());
		history.setChangedAt(LocalDateTime.now());
		stageHistoryRepository.save(history);
	}

	/** Giai doan ke tiep hop le cua {@code current} trong thu tu (dung cho thong bao TC-02). */
	private String nextStageName(OpportunityStage current) {
		OpportunityStage[] stages = OpportunityStage.values();
		int idx = java.util.Arrays.asList(stages).indexOf(current);
		return (idx >= 0 && idx + 1 < stages.length) ? stages[idx + 1].name() : null;
	}

	/** Xac suat tuong ung (TC-01) theo tu giai doan. */
	private BigDecimal probabilityFor(OpportunityStage stage) {
		switch (stage) {
			case APPROACH:    return new BigDecimal("10");
			case PROPOSAL:    return new BigDecimal("40");
			case NEGOTIATION: return new BigDecimal("70");
			case WON:         return new BigDecimal("100");
			case LOST:        return BigDecimal.ZERO;
			default:          return new BigDecimal("20");
		}
	}

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
