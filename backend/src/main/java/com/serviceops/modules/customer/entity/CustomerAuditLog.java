package com.serviceops.modules.customer.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Nhat ky khach hang (NCL-02-CN-002, TC-05): ghi lai nguoi thuc hien
 * ({@code actor}), noi dung ({@code detail}, {@code actionType}) va thoi diem
 * ({@code createdAt}) cua cac thao tac lien quan den chong trung ho so.
 */
@Getter
@Setter
@Entity
@Table(name = "customer_audit_logs")
public class CustomerAuditLog extends BaseEntity {

    @Column(name = "customer_id")
    private Long customerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 30)
    private CustomerAuditAction actionType;

    @Column(name = "detail", length = 1000)
    private String detail;

    /**
     * Nguoi thuc hien. Co the la NULL khi ghi nhan lan tu choi truy cap tu
     * mot request chua xac thuc (khong co JWT) — truong hop nay khong co
     * CustomUserDetails de lay id, nhung van phai ghi lai duoc su kien (TC-04).
     */
    @Column(name = "actor_id")
    private Long actorUserId;

    @Column(name = "actor_username", length = 100)
    private String actorUsername;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}