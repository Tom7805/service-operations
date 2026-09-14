package com.serviceops.modules.customer.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Ghi nhan ly do khi nguoi dung bo qua canh bao trung ho so khach hang (TC-02).
 *
 * <p>Luon bat buoc phai co {@code reason} khi xac nhan tao moi tru cho do co
 * ho so nghi trung (TC-02), va luu {@code overriddenByUserId} de truy vet nguoi
 * thuc hien, noi dung va thoi diem (TC-05).</p>
 */
@Getter
@Setter
@Entity
@Table(name = "customer_duplicate_overrides")
public class CustomerDuplicateOverrideLog extends BaseEntity {

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    /**
     * Id ho so goc truoc khi ban ghi nay bi chuyen sang ho so khac do gop trung
     * (NCL-02-CN-006, TC-02: "ghi vet nguon goc tung ban ghi"). NULL voi ban ghi
     * chua tung bi chuyen.
     */
    @Column(name = "original_customer_id")
    private Long originalCustomerId;

    @Column(name = "reason", nullable = false, length = 1000)
    private String reason;

    @Column(name = "overridden_by", nullable = false)
    private Long overriddenByUserId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}