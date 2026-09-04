package com.serviceops.modules.identity.employee.service;

import com.serviceops.modules.identity.employee.dto.request.EmployeeCreateReq;
import com.serviceops.modules.identity.employee.dto.request.EmployeeSearchReq;
import com.serviceops.modules.identity.employee.dto.request.EmployeeUpdateReq;
import com.serviceops.modules.identity.employee.dto.request.EmploymentContractCreateReq;
import com.serviceops.modules.identity.employee.dto.response.AssignableUserRes;
import com.serviceops.modules.identity.employee.dto.response.EmployeeDetailRes;
import com.serviceops.modules.identity.employee.dto.response.EmployeeRes;
import com.serviceops.modules.identity.employee.dto.response.EmploymentContractRes;

import java.util.List;

public interface EmployeeService {
    List<EmployeeRes> findAll(EmployeeSearchReq request);
    List<AssignableUserRes> findAssignableUsers();
    EmployeeDetailRes findById(Long id);
    EmployeeDetailRes create(EmployeeCreateReq request);
    EmployeeDetailRes update(Long id, EmployeeUpdateReq request);
    EmploymentContractRes addContract(Long employeeId, EmploymentContractCreateReq request);
    List<EmploymentContractRes> findContracts(Long employeeId);
}
