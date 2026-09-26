package com.serviceops.modules.opportunity.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.customer.entity.Customer;
import com.serviceops.modules.customer.repository.CustomerRepository;
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

import java.time.LocalDateTime;
import java.util.List;

/**
 * NCL-03-CN-002: Chuyen giai doan co hoi. NCL-03-CN-005: Ghi nhan ket qua thang/thua.
 *
 * <p>Kiem soat chuyen giai doan ({@link #changeStage}): (TC-01) cap nhat xac suat tuong
 * ung giai doan moi; (TC-02) chuyen theo dung thu tu (QTN-06), tu choi neu nhay coc va
 * neu giai doan hop le ke tiep; (TC-03) khong cho mo lai co hoi da dong (CLOSED); (TC-05)
 * ghi lich su chuyen giai doan va nhat ky co hoi. Tu choi thang gia tri dich WON/LOST — chot
 * ket qua chi duoc phep qua {@link #closeOpportunity}, de khong the bo qua buoc bat buoc ly
 * do khi thua.</p>
 *
 * <p>Ghi nhan ket qua ({@link #closeOpportunity}): THANG chi tu giai doan dam phan; THUA
 * tu bat ky giai doan dang mo nao (QTN-06: "giai doan dich la lien ke hoac la thua"), bat
 * buoc co ly do (TC-02). Moi lan dong deu ghi lich su giai doan va nhat ky rieng
 * {@code CLOSE_WON}/{@code CLOSE_LOST} (TC-04).</p>
 *
 * <p>Moi thao tac tren mot co hoi cu the deu kiem tra pham vi du lieu (QTN-01).</p>
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
	private final OpportunityScopeGuard scopeGuard;
	private final CustomerRepository customerRepository;

	@Override
	public OpportunityRes changeStage(StageChangeReq request) {
		Opportunity opportunity = findInScope(request.opportunityId());
		OpportunityStage target = request.targetStage();

		// TC-03: khong mo lai co hoi da dong (thang/thua).
		if (opportunity.getStatus() == OpportunityStatus.CLOSED) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Co hoi da dong (thang hoac thua) - khong the mo lai");
		}

		// Chot ket qua thang/thua phai di qua closeOpportunity() - API duy nhat bat buoc ly do
		// khi LOST (NCL-03-CN-005 TC-02) va ghi nhat ky rieng CLOSE_WON/CLOSE_LOST (TC-04).
		if (target == OpportunityStage.WON || target == OpportunityStage.LOST) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Khong the chot ket qua Thang/Thua qua chuc nang chuyen giai doan."
							+ " Dung chuc nang Ghi nhan ket qua (POST /opportunities/{id}/close) de bat buoc nhap ly do khi Thua.");
		}

		OpportunityStage current = opportunity.getStage();
		if (current == target) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Co hoi da o giai doan " + current + " - khong co gi de chuyen");
		}

		// TC-02: chuyen theo dung thu tu (QTN-06), tu choi neu nhay coc / lui.
		if (!stageTransitionValidator.canTransition(current, target)) {
			OpportunityStage next = stageTransitionValidator.nextActiveStage(current);
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Giai doan khong hop le. Giai doan hien tai: " + current
							+ (next == null ? "" : " — giai doan hop le ke tiep: " + next)
							+ ". Giai doan dich: " + target);
		}

		// TC-01: cap nhat xac suat tuong ung.
		opportunity.setStage(target);
		opportunity.setProbability(stageTransitionValidator.probabilityFor(target));
		opportunityRepository.save(opportunity);

		// TC-05: ghi lich su chuyen giai doan va nhat ky co hoi.
		recordHistory(opportunity.getId(), current, target);
		auditLogger.recordStageChange(opportunity.getId(),
				"Chuyen giai doan " + current + " -> " + target
						+ " (xac suat " + opportunity.getProbability().stripTrailingZeros().toPlainString() + "%)");

		log.info("OPPORTUNITY_STAGE_CHANGED id={} {} -> {} by={}",
				opportunity.getId(), current, target, currentUserScopeProvider.currentUserId());

		// Vua vao giai doan moi nen so ngay o giai doan = 0.
		return opportunityMapper.toResponse(opportunity, customerName(opportunity), 0L);
	}

	@Override
	@Transactional(readOnly = true)
	public List<StageHistoryRes> history(Long opportunityId) {
		findInScope(opportunityId);
		return stageHistoryRepository.findByOpportunityIdOrderByChangedAtDesc(opportunityId).stream()
				.map(h -> new StageHistoryRes(h.getId(), h.getOpportunityId(),
						h.getFromStage() == null ? null : h.getFromStage().name(),
						h.getToStage().name(),
						h.getChangedByUsername(), h.getChangedAt()))
				.toList();
	}

	@Override
	public OpportunityRes closeOpportunity(Long opportunityId, OpportunityCloseReq request) {
		Opportunity opportunity = findInScope(opportunityId);

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

		// QTN-06: THANG chi tu giai doan dam phan; THUA duoc chot tu moi giai doan dang mo.
		if (!stageTransitionValidator.canTransition(current, result)) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Chi duoc ghi nhan ket qua THANG khi co hoi dang o giai doan dam phan (NEGOTIATION)."
							+ " Giai doan hien tai: " + current);
		}

		opportunity.setStage(result);
		opportunity.setStatus(OpportunityStatus.CLOSED);
		opportunity.setProbability(stageTransitionValidator.probabilityFor(result));
		opportunity.setLossReason(result == OpportunityStage.LOST ? request.lossReason() : null);
		opportunity.setCloseReasonDetail(trimToNull(request.reasonDetail()));
		opportunity.setCompetitorName(trimToNull(request.competitorName()));
		opportunity.setClosedAt(LocalDateTime.now());
		opportunityRepository.save(opportunity);

		// Dung chung lich su chuyen giai doan voi changeStage.
		recordHistory(opportunity.getId(), current, result);

		// TC-04: ghi nhat ky rieng cho ket qua dong co hoi, kem ly do/doi thu de phuc vu bao cao.
		auditLogger.recordClose(opportunity.getId(),
				result == OpportunityStage.WON ? OpportunityAuditAction.CLOSE_WON : OpportunityAuditAction.CLOSE_LOST,
				closeAuditDetail(result, current, opportunity.getLossReason(), opportunity.getCompetitorName()));

		log.info("OPPORTUNITY_CLOSED id={} result={} lossReason={} by={}",
				opportunity.getId(), result, opportunity.getLossReason(), currentUserScopeProvider.currentUserId());

		return opportunityMapper.toResponse(opportunity, customerName(opportunity));
	}

	/** QTN-01: tim co hoi va chan neu nam ngoai pham vi du lieu cua nguoi thao tac. */
	private Opportunity findInScope(Long opportunityId) {
		Opportunity opportunity = opportunityRepository.findById(opportunityId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay co hoi voi id=" + opportunityId));
		scopeGuard.requireInScope(opportunity);
		return opportunity;
	}

	private String customerName(Opportunity opportunity) {
		if (opportunity.getCustomerId() == null) {
			return null;
		}
		return customerRepository.findById(opportunity.getCustomerId()).map(Customer::getName).orElse(null);
	}

	private String closeAuditDetail(OpportunityStage result, OpportunityStage from, LossReason lossReason,
			String competitorName) {
		if (result == OpportunityStage.WON) {
			return "Dong co hoi voi ket qua THANG";
		}
		StringBuilder detail = new StringBuilder("Dong co hoi voi ket qua THUA tu giai doan ").append(from)
				.append(" - ly do: ").append(lossReason);
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

	private String currentUsername() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
