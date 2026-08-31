package com.serviceops.common.audit.entity;

import com.serviceops.common.audit.AuditTargetType;
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
 * Một bản ghi nhật ký thao tác nghiệp vụ tổng hợp — thay cho các ô "nhật ký" giả lập, chỉ tồn tại
 * trên trình duyệt (mất khi tải lại trang) đã dùng trước đây ở các trang Tài khoản, Phân quyền...
 *
 * <p>Không dùng FK cứng sang {@code users} để bảo toàn lịch sử khi tài khoản người thực hiện bị xóa
 * (giống quy ước ở {@link com.serviceops.common.audit.entity.SensitiveDataAccessLog}).</p>
 */
@Getter
@Setter
@Entity
@Table(name = "audit_logs")
public class AuditLog extends BaseEntity {

	@Column(name = "actor_user_id")
	private Long actorUserId;

	@Column(name = "actor_username", length = 100)
	private String actorUsername;

	/** Hành động, dạng chữ dễ đọc (VD: "Tạo tài khoản", "Cấu hình phân quyền"). */
	@Column(nullable = false, length = 100)
	private String action;

	@Enumerated(EnumType.STRING)
	@Column(name = "target_type", nullable = false, columnDefinition = "VARCHAR(30)")
	private AuditTargetType targetType;

	@Column(name = "target_id")
	private Long targetId;

	/** Tên/nhãn hiển thị của đối tượng bị tác động (VD: tên tài khoản, tên bộ phận). */
	@Column(name = "target_label", length = 255)
	private String targetLabel;

	@Column(length = 1000)
	private String detail;

	@Column(name = "performed_at", nullable = false)
	private LocalDateTime performedAt;

	@Column(name = "created_at", insertable = false, updatable = false)
	private LocalDateTime createdAt;
}
