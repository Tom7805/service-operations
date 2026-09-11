package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.ContractAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


public interface ContractAuditLogRepository extends JpaRepository<ContractAuditLog, Long> {

List<ContractAuditLog> findByContractIdOrderByCreatedAtDesc(Long contractId);
}