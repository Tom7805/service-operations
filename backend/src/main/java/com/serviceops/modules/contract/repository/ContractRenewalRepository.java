package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.ContractRenewal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractRenewalRepository extends JpaRepository<ContractRenewal, Long> {

	List<ContractRenewal> findByContractIdOrderByCreatedAtDesc(Long contractId);
}
