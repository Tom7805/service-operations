package com.serviceops.modules.rate.repository;

import com.serviceops.modules.rate.entity.BillRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface BillRateRepository extends JpaRepository<BillRate, Long> {

	Optional<BillRate> findTopByProfessionalRoleIgnoreCaseAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
			String professionalRole, LocalDate effectiveDate);
}