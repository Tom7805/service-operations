package com.serviceops.modules.customer.repository;

import com.serviceops.modules.customer.entity.CustomerDuplicateOverrideLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomerDuplicateOverrideLogRepository extends JpaRepository<CustomerDuplicateOverrideLog, Long> {

    /** Danh sach ly do bo qua canh bao trung cua mot ho so (dung khi gop - NCL-02-CN-006). */
    List<CustomerDuplicateOverrideLog> findByCustomerId(Long customerId);
}