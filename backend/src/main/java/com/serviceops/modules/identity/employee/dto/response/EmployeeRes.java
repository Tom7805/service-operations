package com.serviceops.modules.identity.employee.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeRes(
        Long id,
        Long userId,
        String username,
        String fullName,
        Long departmentId,
        String departmentName,
        String professionalRole,
        BigDecimal standardHoursPerWeek,
        LocalDate hireDate,
        LocalDate endDate
) {}
