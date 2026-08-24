package com.serviceops.modules.identity.employee.repository;

import com.serviceops.modules.identity.employee.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByUser_Id(Long userId);
    boolean existsByUser_Id(Long userId);
    List<Employee> findAllByOrderByHireDateDesc();
}
