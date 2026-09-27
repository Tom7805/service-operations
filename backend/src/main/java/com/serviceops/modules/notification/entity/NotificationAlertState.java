package com.serviceops.modules.notification.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.notification.enums.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Trang thai canh bao hien tai cua mot ban ghi (vi du mot Task) cho mot loai su kien
 * (NCL-14-CN-003, QTN-27-TC-02) — doc lap voi nguoi nhan, vi "dang vuot nguong hay khong" la
 * thuoc tinh cua ban ghi, khong phai cua tung nguoi nhan. {@code episodeNo} tang moi khi mot dot
 * canh bao MOI bat dau (tu binh thuong sang vuot nguong, hoac het cooldown ma van con vuot
 * nguong) — dung de sinh khoa chong trung theo tung nguoi nhan o {@link NotificationAlertDedupLog}.
 */
@Getter
@Setter
@Entity
@Table(name = "notification_alert_states",
		uniqueConstraints = @UniqueConstraint(columnNames = {"event_type", "reference_id"}))
public class NotificationAlertState extends BaseEntity {

	@Enumerated(EnumType.STRING)
	@Column(name = "event_type", nullable = false, columnDefinition = "VARCHAR(50)")
	private NotificationType eventType;

	@Column(name = "reference_id", nullable = false)
	private Long referenceId;

	@Column(name = "active", nullable = false)
	private Boolean active;

	@Column(name = "episode_no", nullable = false)
	private Integer episodeNo;

	@Column(name = "last_alert_at")
	private LocalDateTime lastAlertAt;
}
