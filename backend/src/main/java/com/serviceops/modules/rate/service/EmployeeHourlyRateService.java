package com.serviceops.modules.rate.service;

import com.serviceops.modules.rate.dto.request.EmployeeHourlyRateCreateReq;
import com.serviceops.modules.rate.dto.response.EmployeeHourlyRateRes;
import com.serviceops.modules.rate.dto.response.ResolvedEmployeeHourlyRateRes;

import java.time.LocalDate;
import java.util.List;

public interface EmployeeHourlyRateService {

	EmployeeHourlyRateRes create(Long employeeId, EmployeeHourlyRateCreateReq request);

	List<EmployeeHourlyRateRes> listByEmployee(Long employeeId);

	ResolvedEmployeeHourlyRateRes resolve(Long employeeId, LocalDate asOf);
}

