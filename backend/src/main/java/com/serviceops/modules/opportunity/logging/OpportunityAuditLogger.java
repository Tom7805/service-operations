package com.serviceops.modules.opportunity.logging;

import com.serviceops.modules.opportunity.entity.OpportunityAuditLog;
import com.serviceops.modules.opportunity.enums.OpportunityAuditAction;
import com.serviceops.modules.opportunity.repository.OpportunityAuditLogRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Ghi nhat ky co hoi ban hang (NCL-03-CN-001, TC-04).
 *
 * <p>Lan <b>tu choi truy cap</b> (TC-03) dung {@code REQUIRES_NEW} de nhat ky luon
 * duoc ghi doc lap, khong bi rollback theo thao tac bi chan (giong logic
 * {@code CustomerAuditLogger.logDeniedAccess}).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OpportunityAuditLogger {

	private final OpportunityAuditLogRepository repository;
	private final CurrentUserScopeProvider currentUserScopeProvider;

	/**
	 * Ghi nhat ky tao co hoi moi (TC-04). Chay trong transaction tao de log duoc luu
	 * cung voi co hoi.
	 */
	public void recordCreate(Long opportunityId, String detail) {
		record(opportunityId, OpportunityAuditAction.CREATE, detail);
	}

	/**
	 * Ghi nhat ky dong co hoi voi ket qua thang/thua (NCL-03-CN-005, TC-04). Chay
	 * trong transaction dong de log duoc luu cung voi thay doi giai doan/trang thai
	 * cua co hoi — neu giao dich dong bi rollback thi log cung khong duoc ghi, tranh
	 * nhat ky "mo côi" khong khop voi du lieu thuc te.
	 *
	 * @param action {@link OpportunityAuditAction#CLOSE_WON} hoac {@link OpportunityAuditAction#CLOSE_LOST}.
	 * @param detail Noi dung mo ta ket qua, bao gom ly do thua va doi thu neu co.
	 */
	public void recordClose(Long opportunityId, OpportunityAuditAction action, String detail) {
		record(opportunityId, action, detail);
	}

	/**
	 * Ghi nhat ky them hoat dong cham soc cho co hoi (NCL-03-CN-006, TC-04). Chay
	 * trong transaction them hoat dong de log duoc luu cung voi hoat dong vua tao.
	 */
	public void recordActivityAdd(Long opportunityId, String detail) {
		record(opportunityId, OpportunityAuditAction.ACTIVITY_ADD, detail);
	}

	/**
	 * Ghi nhat ky moi lan sinh bao cao duong ong ban hang theo giai doan
	 * (NCL-03-CN-007, TC-04) — nguoi thuc hien, noi dung (so co hoi / so co hoi dong
	 * lau) va thoi diem. Khong gan voi mot co hoi cu the nen {@code opportunityId} de
	 * {@code null}. Chay trong cung transaction voi truy van bao cao.
	 */
	public void recordReportView(String detail) {
		record(null, OpportunityAuditAction.REPORT_VIEW, detail);
	}

	private void record(Long opportunityId, OpportunityAuditAction action, String detail) {
		OpportunityAuditLog audit = new OpportunityAuditLog();
		audit.setOpportunityId(opportunityId);
		audit.setActionType(action);
		audit.setDetail(detail);
		Long actorId = currentUserScopeProvider.currentUserId();
		audit.setActorId(actorId == null ? 0L : actorId);
		audit.setActorUsername(currentUsername());
		audit.setCreatedAt(LocalDateTime.now());
		repository.save(audit);
	}

	/**
	 * Ghi nhat ky truy cap bi tu choi (TC-03). Doc lap transaction de khong bi rollback.
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void logDeniedAccess(String targetRef, String detail) {
		OpportunityAuditLog audit = new OpportunityAuditLog();
		audit.setOpportunityId(null);
		audit.setActionType(OpportunityAuditAction.DENIED_ACCESS);
		audit.setDetail(detail);
		Long actorId = currentUserScopeProvider.currentUserId();
		audit.setActorId(actorId == null ? 0L : actorId);
		audit.setActorUsername(currentUsername());
		audit.setCreatedAt(LocalDateTime.now());
		repository.save(audit);
		log.warn("OPPORTUNITY_DENIED_ACCESS target={} by={}", targetRef, actorId);
	}

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth == null ? null : auth.getName();
	}
}