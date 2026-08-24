package com.serviceops.modules.identity.employee.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record EmployeeDetailRes(
        Long id,
        Long userId,
        String username,
        String fullName,
        Long departmentId,
        String departmentName,
        String professionalRole,
        BigDecimal standardHoursPerWeek,
        LocalDate hireDate,
        LocalDate endDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<EmploymentContractRes> contracts
) {}
