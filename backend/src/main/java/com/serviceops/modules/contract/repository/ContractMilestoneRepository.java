package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.ContractMilestone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractMilestoneRepository extends JpaRepository<ContractMilestone, Long> {

    List<ContractMilestone> findByContractIdOrderByExpectedDateAscIdAsc(Long contractId);

    void deleteByContractId(Long contractId);
}