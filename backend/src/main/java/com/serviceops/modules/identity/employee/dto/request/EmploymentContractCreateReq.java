package com.serviceops.modules.identity.employee.dto.request;

import com.serviceops.modules.identity.employee.enums.EmploymentType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record EmploymentContractCreateReq(
        @NotNull(message = "Phai chon loai hop dong lao dong")
        EmploymentType contractType,
        @NotNull(message = "Ngay bat dau hop dong khong duoc de trong")
        LocalDate startDate,
        LocalDate endDate
) {}
