package com.serviceops.modules.identity.employee.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record HolidayReq(
        @NotBlank(message = "Ten ngay le khong duoc de trong")
        @Size(max = 255, message = "Ten ngay le khong duoc qua 255 ky tu")
        String name,
        @NotNull(message = "Ngay le khong duoc de trong")
        LocalDate holidayDate,
        boolean recurringYearly
) {}
