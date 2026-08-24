package com.serviceops.modules.identity.employee.repository;

import com.serviceops.modules.identity.employee.entity.EmploymentContract;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmploymentContractRepository extends JpaRepository<EmploymentContract, Long> {
    List<EmploymentContract> findByEmployee_IdOrderByStartDateDesc(Long employeeId);
}
