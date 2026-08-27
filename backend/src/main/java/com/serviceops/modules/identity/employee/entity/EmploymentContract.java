package com.serviceops.modules.identity.employee.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.identity.employee.enums.EmploymentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Mot hop dong lao dong cua nhan su (NCL-01-CN-007) - moi nhan su co the co nhieu hop dong theo thoi gian. */
@Getter
@Setter
@Entity
@Table(name = "employment_contracts")
public class EmploymentContract extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", nullable = false, columnDefinition = "VARCHAR(50)")
    private EmploymentType contractType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
