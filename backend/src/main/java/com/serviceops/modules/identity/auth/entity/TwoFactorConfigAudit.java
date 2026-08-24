package com.serviceops.modules.identity.auth.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "two_factor_config_audits")
public class TwoFactorConfigAudit extends BaseEntity {

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @Column(name = "role_code", nullable = false, length = 50)
    private String roleCode;

    @Column(name = "updated_by_user_id")
    private Long updatedByUserId;

    @Column(name = "updated_by_username", length = 100)
    private String updatedByUsername;

    @Column(name = "previous_enabled", nullable = false)
    private boolean previousEnabled;

    @Column(name = "new_enabled", nullable = false)
    private boolean newEnabled;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;
}