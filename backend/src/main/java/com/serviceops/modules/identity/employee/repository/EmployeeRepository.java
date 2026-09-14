package com.serviceops.modules.identity.employee.repository;

import com.serviceops.modules.identity.employee.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByUser_Id(Long userId);
    boolean existsByUser_Id(Long userId);
    List<Employee> findAllByOrderByHireDateDesc();

    @Query("select e.user.id from Employee e")
    List<Long> findAssignedUserIds();

    /** Nhan su du dieu kien duoc giao viec (NCL-05-CN-003): tai khoan ACTIVE va chua het han hop dong lao dong. */
    @Query("select e from Employee e where e.user.status = com.serviceops.modules.identity.user.enums.UserStatus.ACTIVE "
            + "and (e.endDate is null or e.endDate >= :today) order by e.user.fullName asc")
    List<Employee> findAssignableEmployees(@Param("today") LocalDate today);
}
