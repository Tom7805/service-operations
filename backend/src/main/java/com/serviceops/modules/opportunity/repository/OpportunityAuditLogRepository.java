package com.serviceops.modules.opportunity.repository;

import com.serviceops.modules.opportunity.entity.OpportunityAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OpportunityAuditLogRepository extends JpaRepository<OpportunityAuditLog, Long> {
}
