package com.serviceops.modules.timesheet.repository;

import com.serviceops.modules.timesheet.entity.TimesheetTimer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Truy cap phien dong ho bam gio dang chay (NCL-06-CN-008). */
public interface TimesheetTimerRepository extends JpaRepository<TimesheetTimer, Long> {

	Optional<TimesheetTimer> findByUserId(Long userId);
}
