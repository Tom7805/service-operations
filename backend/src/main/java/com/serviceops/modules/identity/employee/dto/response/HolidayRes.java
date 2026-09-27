package com.serviceops.modules.identity.employee.dto.response;

import java.time.LocalDate;

public record HolidayRes(Long id, String name, LocalDate holidayDate, boolean recurringYearly) {}
