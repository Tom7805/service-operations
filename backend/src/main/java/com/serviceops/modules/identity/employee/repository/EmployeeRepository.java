package com.serviceops.modules.identity.employee.repository;

import com.serviceops.modules.identity.employee.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByUser_Id(Long userId);
    boolean existsByUser_Id(Long userId);
    List<Employee> findAllByOrderByHireDateDesc();

    @Query("select e.user.id from Employee e")
    List<Long> findAssignedUserIds();
}
