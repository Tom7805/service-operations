package com.serviceops.modules.customer.repository;

import com.serviceops.modules.customer.entity.CustomerAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerAuditLogRepository extends JpaRepository<CustomerAuditLog, Long> {
    List<CustomerAuditLog> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}