package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.ContractAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Truy van nhat ky hop dong (NCL-04, TC-04).
 */
public interface ContractAuditLogRepository extends JpaRepository<ContractAuditLog, Long> {

/** Nhat ky cua mot hop dong, moi nhat len dau. */
List<ContractAuditLog> findByContractIdOrderByCreatedAtDesc(Long contractId);
}