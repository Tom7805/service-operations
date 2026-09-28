package com.serviceops.modules.rate.repository;

import com.serviceops.modules.rate.entity.ContractBillRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContractBillRateRepository extends JpaRepository<ContractBillRate, Long> {

	Optional<ContractBillRate> findByContractIdAndProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFrom(
			Long contractId, String professionalRole, String level, LocalDate effectiveFrom);

	Optional<ContractBillRate> findTopByContractIdAndProfessionalRoleIgnoreCaseAndLevelIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
			Long contractId, String professionalRole, String level, LocalDate asOf);

	List<ContractBillRate> findByContractIdOrderByEffectiveFromDesc(Long contractId);
}

