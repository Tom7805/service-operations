package com.serviceops.modules.contract.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.contract.enums.ContractMilestoneStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "contract_milestones")
public class ContractMilestone extends BaseEntity {

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(precision = 5, scale = 2)
    private BigDecimal percentage;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "expected_date")
    private LocalDate expectedDate;

    @Column(name = "acceptance_condition", length = 1000)
    private String acceptanceCondition;

    /**
     * columnDefinition khai tuong minh VARCHAR(30) — thieu no thi Hibernate 6
     * tren dialect MySQL tu suy luan sang kieu ENUM goc cua co so du lieu
     * thay vi VARCHAR, gay loi validate schema luc khoi dong ung dung du
     * migration (V44) da tao dung cot VARCHAR(30). Cung quy uoc voi
     * Contract.status/contractType va ContractAuditLog.actionType.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "VARCHAR(30)")
    private ContractMilestoneStatus status = ContractMilestoneStatus.PENDING;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}