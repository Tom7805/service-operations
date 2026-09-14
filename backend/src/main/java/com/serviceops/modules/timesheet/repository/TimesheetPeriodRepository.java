package com.serviceops.modules.timesheet.repository;

import com.serviceops.modules.timesheet.entity.TimesheetPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface TimesheetPeriodRepository extends JpaRepository<TimesheetPeriod, Long> {

	/** Ky cham cong chua mot ngay cu the (dung de kiem tra khoa — NCL-06-CN-005-TC-03). */
	@Query("SELECT p FROM TimesheetPeriod p WHERE :date BETWEEN p.periodStart AND p.periodEnd")
	Optional<TimesheetPeriod> findByDate(@Param("date") LocalDate date);
}
