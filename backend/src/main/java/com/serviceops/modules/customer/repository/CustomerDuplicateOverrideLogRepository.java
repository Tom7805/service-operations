package com.serviceops.modules.customer.repository;

import com.serviceops.modules.customer.entity.CustomerDuplicateOverrideLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerDuplicateOverrideLogRepository extends JpaRepository<CustomerDuplicateOverrideLog, Long> {
}