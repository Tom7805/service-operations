package com.serviceops.modules.identity.employee.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.identity.department.entity.Department;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Ho so nhan su (NCL-01-CN-007): gan voi mot tai khoan duy nhat, chua bo phan,
 * vai tro chuyen mon, ngay vao/ket thuc va gio lam viec chuan mot tuan
 * (mau so cua ty le gio tinh phi - QTN-23).
 */
@Getter
@Setter
@Entity
@Table(name = "employees")
public class Employee extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(name = "professional_role", length = 255)
    private String professionalRole;

    @Column(name = "standard_hours_per_week", nullable = false, precision = 5, scale = 2)
    private BigDecimal standardHoursPerWeek;

    @Column(name = "hire_date", nullable = false)
    private LocalDate hireDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
