package com.serviceops.modules.identity.employee.mapper;

import com.serviceops.modules.identity.employee.dto.response.EmployeeDetailRes;
import com.serviceops.modules.identity.employee.dto.response.EmployeeRes;
import com.serviceops.modules.identity.employee.dto.response.EmploymentContractRes;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.entity.EmploymentContract;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EmployeeMapper {

    public EmployeeRes toResponse(Employee employee) {
        return new EmployeeRes(
                employee.getId(),
                employee.getUser().getId(),
                employee.getUser().getUsername(),
                employee.getUser().getFullName(),
                employee.getDepartment() == null ? null : employee.getDepartment().getId(),
                employee.getDepartment() == null ? null : employee.getDepartment().getName(),
                employee.getProfessionalRole(),
                employee.getStandardHoursPerWeek(),
                employee.getHireDate(),
                employee.getEndDate());
    }

    public EmployeeDetailRes toDetailResponse(Employee employee, List<EmploymentContractRes> contracts) {
        return new EmployeeDetailRes(
                employee.getId(),
                employee.getUser().getId(),
                employee.getUser().getUsername(),
                employee.getUser().getFullName(),
                employee.getDepartment() == null ? null : employee.getDepartment().getId(),
                employee.getDepartment() == null ? null : employee.getDepartment().getName(),
                employee.getProfessionalRole(),
                employee.getStandardHoursPerWeek(),
                employee.getHireDate(),
                employee.getEndDate(),
                employee.getCreatedAt(),
                employee.getUpdatedAt(),
                contracts);
    }

    public EmploymentContractRes toContractResponse(EmploymentContract contract) {
        return new EmploymentContractRes(
                contract.getId(),
                contract.getEmployee().getId(),
                contract.getContractType(),
                contract.getStartDate(),
                contract.getEndDate(),
                contract.getCreatedAt());
    }
}
