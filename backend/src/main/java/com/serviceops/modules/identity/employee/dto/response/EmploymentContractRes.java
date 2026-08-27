package com.serviceops.modules.identity.employee.dto.response;

import com.serviceops.modules.identity.employee.enums.EmploymentType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EmploymentContractRes(
        Long id,
        Long employeeId,
        EmploymentType contractType,
        LocalDate startDate,
        LocalDate endDate,
        LocalDateTime createdAt
) {}
