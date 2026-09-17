package com.serviceops.modules.expense.repository;

import com.serviceops.modules.expense.entity.OverheadPool;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface OverheadPoolRepository extends JpaRepository<OverheadPool, Long> {

	/** NCL-08-CN-005: moi ky (thang) chi duoc phan bo mot lan. */
	Optional<OverheadPool> findByPeriodStart(LocalDate periodStart);
}
