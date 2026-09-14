package com.serviceops.modules.timesheet.repository;

import com.serviceops.modules.timesheet.entity.Timesheet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimesheetRepository extends JpaRepository<Timesheet, Long> {
}
