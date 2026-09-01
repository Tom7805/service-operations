package com.serviceops.common.audit.specification;

import com.serviceops.common.audit.dto.AuditLogSearchReq;
import com.serviceops.common.audit.entity.AuditLog;
import org.springframework.data.jpa.domain.Specification;

public final class AuditLogSpecification {

	private AuditLogSpecification() {
	}

	public static Specification<AuditLog> from(AuditLogSearchReq req) {
		Specification<AuditLog> spec = Specification.where(null);

		if (req.getActorUsername() != null && !req.getActorUsername().isBlank()) {
			String like = "%" + req.getActorUsername().trim().toLowerCase() + "%";
			spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("actorUsername")), like));
		}

		if (req.getTargetType() != null) {
			spec = spec.and((root, query, cb) -> cb.equal(root.get("targetType"), req.getTargetType()));
		}

		if (req.getAction() != null && !req.getAction().isBlank()) {
			String like = "%" + req.getAction().trim().toLowerCase() + "%";
			spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("action")), like));
		}

		if (req.getFrom() != null) {
			spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("performedAt"), req.getFrom()));
		}

		if (req.getTo() != null) {
			spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("performedAt"), req.getTo()));
		}

		return spec;
	}
}
