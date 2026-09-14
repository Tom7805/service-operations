package com.serviceops.modules.project.repository;

import com.serviceops.modules.project.entity.ProjectAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectAuditLogRepository extends JpaRepository<ProjectAuditLog, Long> {
}