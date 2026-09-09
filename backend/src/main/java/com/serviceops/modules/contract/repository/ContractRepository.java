package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.Contract;
import com.serviceops.modules.contract.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContractRepository extends JpaRepository<Contract, Long> {

	Optional<Contract> findByOpportunityId(Long opportunityId);

	boolean existsByOpportunityId(Long opportunityId);

	List<Contract> findByCustomerId(Long customerId);

	List<Contract> findByStatusAndEndDateBetween(ContractStatus status, LocalDate from, LocalDate to);

	List<Contract> findByStatusAndEndDateBefore(ContractStatus status, LocalDate date);
}