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
		OpportunityAuditLog audit = new OpportunityAuditLog();
		audit.setOpportunityId(opportunityId);
		audit.setActionType(OpportunityAuditAction.CREATE);
		audit.setDetail(detail);
		audit.setActorId(currentUserScopeProvider.currentUserId());
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