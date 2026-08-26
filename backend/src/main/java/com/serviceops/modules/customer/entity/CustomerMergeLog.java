package com.serviceops.modules.customer.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Nhat ky chi tiet cac lan gop hai ho so khach hang trung (NCL-02-CN-006, TC-04).
 *
 * <p>Luu snapshot ma/ten cua ca hai ho so tai thoi diem gop vi ho so "bi gop"
 * ({@code sourceCustomerId}) chuyen sang trang thai {@code MERGED} ngay sau do va
 * co the khong con duoc hien thi day du o cac man hinh khac.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "customer_merge_logs")
public class CustomerMergeLog extends BaseEntity {

    /** Ho so "bi gop" (ho so phu) - se chuyen sang trang thai da gop sau khi luu ban ghi nay. */
    @Column(name = "source_customer_id", nullable = false)
    private Long sourceCustomerId;

    @Column(name = "source_customer_code", length = 20)
    private String sourceCustomerCode;

    @Column(name = "source_customer_name", length = 255)
    private String sourceCustomerName;

    /** Ho so "giu lai" (ho so chinh) - nhan toan bo du lieu lien quan cua ho so bi gop. */
    @Column(name = "target_customer_id", nullable = false)
    private Long targetCustomerId;

    @Column(name = "target_customer_code", length = 20)
    private String targetCustomerCode;

    @Column(name = "target_customer_name", length = 255)
    private String targetCustomerName;

    /** Mo ta ngan gon cac ban ghi da duoc chuyen ve ho so giu lai (TC-02). */
    @Column(name = "moved_record_summary", length = 1000)
    private String movedRecordSummary;

    @Column(name = "performed_by", nullable = false)
    private Long performedByUserId;

    @Column(name = "performed_by_username", length = 100)
    private String performedByUsername;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
