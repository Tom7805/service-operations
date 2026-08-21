package com.serviceops.common.audit;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Nhật ký thao tác: ghi lại người thực hiện, hành động, đối tượng liên quan
 * và thời điểm — dùng chung cho tiêu chí "Lưu lịch sử" của mọi story.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "audit_logs")
public class AuditLog extends BaseEntity {

    /** id của người dùng thực hiện thao tác; null nếu là hệ thống tự động thực hiện. */
    @Column(name = "actor_user_id")
    private Long actorUserId;

    /** Tên hiển thị của người thực hiện tại thời điểm ghi log, phòng khi tài khoản đổi sau này. */
    @Column(name = "actor_display_name", length = 150)
    private String actorDisplayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 50)
    private AuditAction action;

    @Column(name = "target_type", length = 50)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "detail", length = 500)
    private String detail;

    /** Địa chỉ IP của người thực hiện, phục vụ tra soát khi có nghi vấn rò rỉ dữ liệu. */
    @Column(name = "ip_address", length = 64)
    private String ipAddress;
}
