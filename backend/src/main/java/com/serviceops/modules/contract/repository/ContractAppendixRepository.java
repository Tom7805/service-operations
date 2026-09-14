package com.serviceops.modules.contract.repository;

import com.serviceops.modules.contract.entity.ContractAppendix;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContractAppendixRepository extends JpaRepository<ContractAppendix, Long> {

	List<ContractAppendix> findByContractIdOrderByEffectiveDateAscIdAsc(Long contractId);
}