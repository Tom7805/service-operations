package com.serviceops.modules.identity.employee.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.department.repository.DepartmentRepository;
import com.serviceops.modules.identity.employee.dto.request.EmployeeCreateReq;
import com.serviceops.modules.identity.employee.dto.request.EmployeeUpdateReq;
import com.serviceops.modules.identity.employee.dto.response.EmployeeDetailRes;
import com.serviceops.modules.identity.employee.entity.Employee;
import com.serviceops.modules.identity.employee.mapper.EmployeeMapper;
import com.serviceops.modules.identity.employee.repository.EmployeeRepository;
import com.serviceops.modules.identity.employee.repository.EmploymentContractRepository;
import com.serviceops.modules.identity.employee.validator.EmploymentPeriodValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test EmployeeServiceImpl - cover TC-01, TC-02, TC-03 cua NCL-01-CN-007.
 */
@ExtendWith(MockitoExtension.class)
class EmployeeServiceImplTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private EmploymentContractRepository employmentContractRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private CurrentUserScopeProvider currentUserScopeProvider;

    private final EmployeeMapper employeeMapper = new EmployeeMapper();
    private final EmploymentPeriodValidator employmentPeriodValidator = new EmploymentPeriodValidator();

    private EmployeeServiceImpl service;

    private User user;

    @BeforeEach
    void setUp() {
        service = new EmployeeServiceImpl(employeeRepository, employmentContractRepository, userRepository,
                departmentRepository, employeeMapper, employmentPeriodValidator, currentUserScopeProvider);

        user = new User();
        user.setId(1L);
        user.setUsername("nhanvien01");
        user.setFullName("Nguyen Van A");

        lenient().when(employeeRepository.save(any(Employee.class))).thenAnswer(inv -> {
            Employee e = inv.getArgument(0);
            if (e.getId() == null) {
                e.setId(100L);
            }
            return e;
        });
    }

    @Test
    @DisplayName("TC-01: khai bao ho so voi bon muoi gio chuan duoc luu dung gia tri")
    void createsProfileWithExplicitFortyHours() {
        when(employeeRepository.existsByUser_Id(1L)).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        EmployeeCreateReq req = new EmployeeCreateReq(1L, null, "Ky su phan mem",
                LocalDate.of(2026, 1, 1), null, new BigDecimal("40.00"));

        EmployeeDetailRes result = service.create(req);

        assertThat(result.standardHoursPerWeek()).isEqualByComparingTo("40.00");
        assertThat(result.username()).isEqualTo("nhanvien01");
    }

    @Test
    @DisplayName("TC-02: nhan su ban thoi gian hai muoi gio khong bi ghi de thanh bon muoi")
    void keepsExplicitPartTimeHoursInsteadOfDefault() {
        when(employeeRepository.existsByUser_Id(1L)).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        EmployeeCreateReq req = new EmployeeCreateReq(1L, null, "Ke toan",
                LocalDate.of(2026, 1, 1), null, new BigDecimal("20.00"));

        EmployeeDetailRes result = service.create(req);

        assertThat(result.standardHoursPerWeek()).isEqualByComparingTo("20.00");
    }

    @Test
    @DisplayName("Khong nhap gio chuan thi mac dinh bon muoi gio mot tuan")
    void defaultsToFortyHoursWhenNotProvided() {
        when(employeeRepository.existsByUser_Id(1L)).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        EmployeeCreateReq req = new EmployeeCreateReq(1L, null, null,
                LocalDate.of(2026, 1, 1), null, null);

        EmployeeDetailRes result = service.create(req);

        assertThat(result.standardHoursPerWeek()).isEqualByComparingTo("40.00");
    }

    @Test
    @DisplayName("TC-03: ngay ket thuc som hon ngay vao lam thi bao loi va khong luu")
    void rejectsEndDateBeforeHireDate() {
        EmployeeCreateReq req = new EmployeeCreateReq(1L, null, null,
                LocalDate.of(2026, 3, 1), LocalDate.of(2026, 1, 1), null);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_STATE);

        verify(employeeRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("Tai khoan da co ho so nhan su thi bi tu choi tao trung")
    void rejectsDuplicateEmployeeProfileForSameUser() {
        when(employeeRepository.existsByUser_Id(1L)).thenReturn(true);

        EmployeeCreateReq req = new EmployeeCreateReq(1L, null, null, LocalDate.of(2026, 1, 1), null, null);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
                .isEqualTo(ErrorCode.DUPLICATE_DATA);
    }

    @Test
    @DisplayName("Tai khoan khong ton tai thi bao khong tim thay")
    void rejectsCreateWhenUserDoesNotExist() {
        when(employeeRepository.existsByUser_Id(99L)).thenReturn(false);
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        EmployeeCreateReq req = new EmployeeCreateReq(99L, null, null, LocalDate.of(2026, 1, 1), null, null);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
                .isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("Cap nhat ho so cung kiem tra ngay ket thuc khong duoc som hon ngay vao")
    void updateAlsoValidatesPeriod() {
        Employee existing = new Employee();
        existing.setId(5L);
        existing.setUser(user);
        existing.setHireDate(LocalDate.of(2026, 1, 1));
        existing.setStandardHoursPerWeek(new BigDecimal("40.00"));
        when(employeeRepository.findById(5L)).thenReturn(Optional.of(existing));

        EmployeeUpdateReq req = new EmployeeUpdateReq(null, null,
                LocalDate.of(2026, 5, 1), LocalDate.of(2026, 4, 1), null);

        assertThatThrownBy(() -> service.update(5L, req))
                .isInstanceOf(BusinessRuleException.class)
                .extracting(ex -> ((BusinessRuleException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_STATE);
    }
}
