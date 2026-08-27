package com.serviceops.modules.identity.auth.repository;

import com.serviceops.modules.identity.auth.entity.TwoFactorConfigAudit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TwoFactorConfigAuditRepository extends JpaRepository<TwoFactorConfigAudit, Long> {
}