package com.serviceops.modules.rate.repository;

import com.serviceops.modules.rate.entity.EmployeeHourlyRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeHourlyRateRepository extends JpaRepository<EmployeeHourlyRate, Long> {

	Optional<EmployeeHourlyRate> findByEmployeeIdAndEffectiveFrom(Long employeeId, LocalDate effectiveFrom);

	Optional<EmployeeHourlyRate> findTopByEmployeeIdAndEffectiveFromLessThanEqualOrderByEffectiveFromDesc(
			Long employeeId, LocalDate asOf);

	List<EmployeeHourlyRate> findByEmployeeIdOrderByEffectiveFromDesc(Long employeeId);
}

