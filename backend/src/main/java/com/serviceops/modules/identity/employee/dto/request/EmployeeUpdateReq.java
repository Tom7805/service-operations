package com.serviceops.modules.identity.employee.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeUpdateReq(
        Long departmentId,
        @Size(max = 255, message = "Vai tro chuyen mon khong duoc qua 255 ky tu")
        String professionalRole,
        @NotNull(message = "Ngay vao lam khong duoc de trong")
        LocalDate hireDate,
        LocalDate endDate,
        @DecimalMin(value = "0.01", message = "Gio lam viec chuan phai lon hon khong")
        BigDecimal standardHoursPerWeek
) {}
