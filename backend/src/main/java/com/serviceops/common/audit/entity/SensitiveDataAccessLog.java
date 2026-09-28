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

    @Column(nullable = false, length = 100)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "VARCHAR(20)")
    private AccessAction action;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, columnDefinition = "VARCHAR(30)")
    private SensitiveDataType dataType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "target_ref", length = 255)
    private String targetRef;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(length = 1000)
    private String detail;

    @Column(name = "accessed_at", nullable = false)
    private LocalDateTime accessedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
