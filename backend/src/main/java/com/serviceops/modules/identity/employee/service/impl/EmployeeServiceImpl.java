package com.serviceops.modules.identity.employee.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import com.serviceops.modules.identity.employee.dto.request.EmployeeCreateReq;
import com.serviceops.modules.identity.employee.dto.request.EmployeeSearchReq;
import com.serviceops.modules.identity.employee.dto.request.EmployeeUpdateReq;
import com.serviceops.modules.identity.employee.dto.request.EmploymentContractCreateReq;
import com.serviceops.modules.identity.employee.dto.response.AssignableUserRes;
import com.serviceops.modules.identity.employee.dto.response.EmployeeDetailRes;
import com.serviceops.modules.identity.employee.dto.response.EmployeeRes;
import com.serviceops.modules.identity.employee.dto.response.EmploymentContractRes;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.entity.EmploymentContract;
import com.serviceops.modules.identity.employee.mapper.EmployeeMapper;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.employee.repository.EmploymentContractRepository;
import com.serviceops.modules.identity.employee.service.EmployeeService;
import com.serviceops.modules.identity.employee.validator.EmploymentPeriodValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Quan ly ho so nhan su va gio lam viec chuan (NCL-01-CN-007).
 *
 * <p>Gio lam viec chuan (standardHoursPerWeek) la mau so cua ty le gio tinh phi (QTN-23):
 * neu HR khong nhap gia tri, he thong ap dung mac dinh bon muoi gio/tuan; neu HR nhap ro
 * (vi du hai muoi gio cho nhan su ban thoi gian), he thong luu dung gia tri do, khong bao
 * gio ghi de bang mac dinh (TC-01, TC-02).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeServiceImpl implements EmployeeService {

    private static final BigDecimal DEFAULT_STANDARD_HOURS_PER_WEEK = new BigDecimal("40.00");

    private final EmployeeRepository employeeRepository;
    private final EmploymentContractRepository employmentContractRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeMapper employeeMapper;
    private final EmploymentPeriodValidator employmentPeriodValidator;
    private final CurrentUserScopeProvider currentUserScopeProvider;

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeRes> findAll(EmployeeSearchReq request) {
        String keyword = normalizeKeyword(request == null ? null : request.getKeyword());
        Long departmentId = request == null ? null : request.getDepartmentId();
        return employeeRepository.findAllByOrderByHireDateDesc().stream()
                .filter(employee -> departmentId == null
                        || (employee.getDepartment() != null && departmentId.equals(employee.getDepartment().getId())))
                .filter(employee -> keyword == null
                        || employee.getUser().getUsername().toLowerCase().contains(keyword)
                        || employee.getUser().getFullName().toLowerCase().contains(keyword))
                .map(employeeMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignableUserRes> findAssignableUsers() {
        java.util.Set<Long> assigned = new java.util.HashSet<>(employeeRepository.findAssignedUserIds());
        return userRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(User::getUsername, String.CASE_INSENSITIVE_ORDER))
                .map(user -> new AssignableUserRes(user.getId(), user.getUsername(), user.getFullName(),
                        assigned.contains(user.getId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeDetailRes findById(Long id) {
        Employee employee = getEmployee(id);
        return employeeMapper.toDetailResponse(employee, findContracts(id));
    }

    @Override
    public EmployeeDetailRes create(EmployeeCreateReq request) {
        if (employeeRepository.existsByUser_Id(request.userId())) {
            throw new BusinessRuleException(ErrorCode.DUPLICATE_DATA, "Tai khoan nay da co ho so nhan su");
        }
        employmentPeriodValidator.validate(request.hireDate(), request.endDate());

        Employee employee = new Employee();
        employee.setUser(getUser(request.userId()));
        employee.setDepartment(findDepartment(request.departmentId()));
        employee.setProfessionalRole(normalize(request.professionalRole()));
        employee.setHireDate(request.hireDate());
        employee.setEndDate(request.endDate());
        employee.setStandardHoursPerWeek(resolveStandardHours(request.standardHoursPerWeek()));
        employee = employeeRepository.save(employee);

        log.info("EMPLOYEE_CREATED employeeId={} userId={} by={}", employee.getId(),
                employee.getUser().getId(), currentUserScopeProvider.currentUserId());
        return employeeMapper.toDetailResponse(employee, List.of());
    }

    @Override
    public EmployeeDetailRes update(Long id, EmployeeUpdateReq request) {
        Employee employee = getEmployee(id);
        employmentPeriodValidator.validate(request.hireDate(), request.endDate());

        employee.setDepartment(findDepartment(request.departmentId()));
        employee.setProfessionalRole(normalize(request.professionalRole()));
        employee.setHireDate(request.hireDate());
        employee.setEndDate(request.endDate());
        employee.setStandardHoursPerWeek(resolveStandardHours(request.standardHoursPerWeek()));
        employee = employeeRepository.save(employee);

        log.info("EMPLOYEE_UPDATED employeeId={} by={}", employee.getId(), currentUserScopeProvider.currentUserId());
        return employeeMapper.toDetailResponse(employee, findContracts(id));
    }

    @Override
    public EmploymentContractRes addContract(Long employeeId, EmploymentContractCreateReq request) {
        Employee employee = getEmployee(employeeId);
        employmentPeriodValidator.validate(request.startDate(), request.endDate());

        EmploymentContract contract = new EmploymentContract();
        contract.setEmployee(employee);
        contract.setContractType(request.contractType());
        contract.setStartDate(request.startDate());
        contract.setEndDate(request.endDate());
        contract = employmentContractRepository.save(contract);

        log.info("EMPLOYMENT_CONTRACT_CREATED employeeId={} contractId={} by={}", employeeId,
                contract.getId(), currentUserScopeProvider.currentUserId());
        return employeeMapper.toContractResponse(contract);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmploymentContractRes> findContracts(Long employeeId) {
        return employmentContractRepository.findByEmployee_IdOrderByStartDateDesc(employeeId).stream()
                .map(employeeMapper::toContractResponse)
                .toList();
    }

    private BigDecimal resolveStandardHours(BigDecimal requested) {
        return requested == null ? DEFAULT_STANDARD_HOURS_PER_WEEK : requested;
    }

    private Employee getEmployee(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay ho so nhan su"));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay tai khoan nhan vien"));
    }

    private Department findDepartment(Long departmentId) {
        if (departmentId == null) {
            return null;
        }
        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay bo phan"));
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeKeyword(String keyword) {
        return keyword == null || keyword.isBlank() ? null : keyword.trim().toLowerCase();
    }
}
