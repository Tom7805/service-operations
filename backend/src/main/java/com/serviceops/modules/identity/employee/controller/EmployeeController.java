package com.serviceops.modules.identity.employee.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.employee.dto.request.EmployeeCreateReq;
import com.serviceops.modules.identity.employee.dto.request.EmployeeSearchReq;
import com.serviceops.modules.identity.employee.dto.request.EmployeeUpdateReq;
import com.serviceops.modules.identity.employee.dto.request.EmploymentContractCreateReq;
import com.serviceops.modules.identity.employee.dto.response.EmployeeDetailRes;
import com.serviceops.modules.identity.employee.dto.response.EmployeeRes;
import com.serviceops.modules.identity.employee.dto.response.EmploymentContractRes;
import com.serviceops.modules.identity.employee.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Quan ly ho so nhan su va gio lam viec chuan (NCL-01-CN-007).
 * Chi Nhan su (VT-06) va Quan tri vien (VT-07) duoc truy cap (TC-04).
 */
@RestController
@RequestMapping("/employees")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-06') or hasRole('VT-07')")
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public BaseRes<List<EmployeeRes>> findAll(EmployeeSearchReq request) {
        return BaseRes.ok(employeeService.findAll(request));
    }

    @GetMapping("/{id}")
    public BaseRes<EmployeeDetailRes> findById(@PathVariable Long id) {
        return BaseRes.ok(employeeService.findById(id));
    }

    @PostMapping
    public BaseRes<EmployeeDetailRes> create(@Valid @RequestBody EmployeeCreateReq request) {
        return BaseRes.ok("Tao ho so nhan su thanh cong", employeeService.create(request));
    }

    @PutMapping("/{id}")
    public BaseRes<EmployeeDetailRes> update(@PathVariable Long id, @Valid @RequestBody EmployeeUpdateReq request) {
        return BaseRes.ok("Cap nhat ho so nhan su thanh cong", employeeService.update(id, request));
    }

    @PostMapping("/{id}/contracts")
    public BaseRes<EmploymentContractRes> addContract(@PathVariable Long id,
            @Valid @RequestBody EmploymentContractCreateReq request) {
        return BaseRes.ok("Ghi nhan hop dong lao dong thanh cong", employeeService.addContract(id, request));
    }

    @GetMapping("/{id}/contracts")
    public BaseRes<List<EmploymentContractRes>> findContracts(@PathVariable Long id) {
        return BaseRes.ok(employeeService.findContracts(id));
    }
}
