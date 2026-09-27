package com.serviceops.modules.notification.dto.response;

import com.serviceops.modules.notification.enums.NotificationChannel;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.enums.NotificationSeverity;
import com.serviceops.modules.notification.enums.NotificationTargetType;
import com.serviceops.modules.notification.enums.NotificationType;

import java.time.LocalDateTime;

/**
 * {@code targetType}: loai ban ghi de FE dieu huong khi mo thong bao (NCL-14-CN-001 TC-02) —
 * suy ra tu {@code type}, xem giai thich chi tiet tai {@link NotificationTargetType}. Khac voi
 * {@code referenceType}, von co the la khoa chong gui trung (QTN-27) o mot so loai thong bao
 * nen khong dung duoc de dieu huong.
 */
public record NotificationRes(Long id, Long recipientId, NotificationType type, String title, String content,
		NotificationChannel channel, Long referenceId, String referenceType, NotificationTargetType targetType,
		Boolean isRead, LocalDateTime readAt, LocalDateTime sentAt, NotificationGroup notificationGroup,
		NotificationSeverity severity) {
}