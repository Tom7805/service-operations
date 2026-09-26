package com.serviceops.modules.notification.entity;

import com.serviceops.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Khoa "chiem truoc" dung chung cho QTN-27 khi mot tac vu co the chay lai (retry/crash giua
 * chung) trong cung chu ky va can dam bao chi xu ly dung mot lan. Pham vi hien tai: chi dung boi
 * {@code NotificationDigestServiceImpl} de chong gop trung ban tong hop cuoi ngay
 * (NCL-14-CN-002) — KHONG thay the cac co che chong trung rieng dang chay on dinh o cac module
 * khac (vi du referenceType string o MarginAlertServiceImpl/TimesheetReminderServiceImpl, hay
 * DunningLog rieng o DunningServiceImpl).
 */
@Getter
@Setter
@Entity
@Table(name = "notification_dedup_keys", uniqueConstraints = @UniqueConstraint(columnNames = "dedup_key"))
public class NotificationDedupKey extends BaseEntity {

	@Column(name = "dedup_key", nullable = false, length = 255)
	private String dedupKey;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;
}
