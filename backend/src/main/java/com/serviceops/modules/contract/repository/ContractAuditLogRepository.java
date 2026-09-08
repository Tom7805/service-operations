package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.ContractAuditLog;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Truy van nhat ky hop dong (NCL-04, TC-04).
 */
public interface ContractAuditLogRepository extends JpaRepository<ContractAuditLog, Long> {

/** Nhat ky cua mot hop dong, moi nhat len dau. */
List<ContractAuditLog> findByContractIdOrderByCreatedAtDesc(Long contractId);

/**
 * Kiem tra da co nhat ky cua mot hanh dong cho hop dong trong khoang thoi
 * gian cho truoc hay chua (NCL-04-CN-006, QTN-27) - dung de chong gui trung
 * nhac hop dong trong cung mot ngay khi tac vu ra soat chay nhieu lan.
 */
boolean existsByContractIdAndActionTypeAndCreatedAtBetween(
		Long contractId, ContractAuditAction actionType, LocalDateTime start, LocalDateTime end);
}