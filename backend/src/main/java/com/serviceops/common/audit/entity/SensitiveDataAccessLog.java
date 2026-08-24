package com.serviceops.common.audit.entity;

import com.serviceops.common.audit.enums.AccessAction;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Bản ghi nhật ký truy cập dữ liệu nhạy cảm (NCL-01-CN-006, QTN-03).
 *
 * <p>Không dùng quan hệ FK cứng sang {@code users} để bảo toàn lịch sử (TC-04):
 * khi người dùng bị xóa, nhật ký vẫn được giữ lại qua {@code username} denormalized.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "sensitive_access_logs")
public class SensitiveDataAccessLog extends BaseEntity {

    /** Mã người dùng thực hiện truy cập (tham chiếu logic {@code users.id}). */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Tên tài khoản người thực hiện (denormalized để bảo toàn lịch sử). */
    @Column(nullable = false, length = 100)
    private String username;

    /** Hành động truy cập (xem / xuất / bị từ chối). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "VARCHAR(20)")
    private AccessAction action;

    /** Loại dữ liệu nhạy cảm bị truy cập. */
    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, columnDefinition = "VARCHAR(30)")
    private SensitiveDataType dataType;

    /** Mã đối tượng dữ liệu cụ thể bị truy cập (nếu có). */
    @Column(name = "target_id")
    private Long targetId;

    /** Tham chiếu / mô tả đối tượng dữ liệu bị truy cập (nếu có). */
    @Column(name = "target_ref", length = 255)
    private String targetRef;

    /** Địa chỉ IP nguồn của thao tác truy cập. */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /** Chi tiết bổ sung của thao tác truy cập. */
    @Column(length = 1000)
    private String detail;

    /** Thời điểm thao tác truy cập diễn ra. */
    @Column(name = "accessed_at", nullable = false)
    private LocalDateTime accessedAt;

    /** Thời điểm bản ghi nhật ký được tạo. */
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
