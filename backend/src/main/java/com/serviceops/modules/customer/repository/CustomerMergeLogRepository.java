package com.serviceops.modules.customer.repository;

import com.serviceops.modules.customer.entity.CustomerMergeLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerMergeLogRepository extends JpaRepository<CustomerMergeLog, Long> {
}
