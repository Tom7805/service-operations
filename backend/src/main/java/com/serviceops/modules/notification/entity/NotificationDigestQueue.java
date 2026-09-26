package com.serviceops.modules.notification.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.enums.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Hang doi tam cho cac thong bao thuoc nhom nguoi dung chon nhan theo tan suat
 * {@code DAILY_DIGEST} (NCL-14-CN-002 TC-02) — {@code NotificationDispatcherImpl} ghi vao day
 * thay vi luu thang vao {@code notifications}; {@code NotificationDigestServiceImpl} gop theo
 * (recipientId, notificationGroup) cuoi ngay thanh mot Notification tong hop roi xoa cac item da
 * gop khoi bang nay.
 */
@Getter
@Setter
@Entity
@Table(name = "notification_digest_queue")
public class NotificationDigestQueue extends BaseEntity {

	@Column(name = "recipient_id", nullable = false)
	private Long recipientId;

	@Enumerated(EnumType.STRING)
	@Column(name = "notification_group", nullable = false, columnDefinition = "VARCHAR(50)")
	private NotificationGroup notificationGroup;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false, columnDefinition = "VARCHAR(50)")
	private NotificationType type;

	@Column(name = "title", nullable = false, length = 255)
	private String title;

	@Column(name = "content", columnDefinition = "TEXT")
	private String content;

	@Column(name = "reference_id")
	private Long referenceId;

	@Column(name = "reference_type", length = 255)
	private String referenceType;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
