package com.serviceops.modules.rate.repository;

import com.serviceops.modules.rate.entity.WorkTypeRateFactor;
import com.serviceops.modules.timesheet.enums.WorkType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkTypeRateFactorRepository extends JpaRepository<WorkTypeRateFactor, Long> {

	Optional<WorkTypeRateFactor> findByWorkType(WorkType workType);

	List<WorkTypeRateFactor> findAllByOrderByWorkTypeAsc();
}
