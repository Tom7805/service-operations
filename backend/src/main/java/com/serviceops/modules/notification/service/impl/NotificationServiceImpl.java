package com.serviceops.modules.notification.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.notification.dto.response.NotificationRes;
import com.serviceops.modules.notification.entity.Notification;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.mapper.NotificationMapper;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationDispatcher;
import com.serviceops.modules.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

	private static final String TARGET_LABEL = "Thong bao";

	private final NotificationRepository notificationRepository;
	private final NotificationMapper notificationMapper;
	private final AuditLogService auditLogService;
	private final NotificationDispatcher notificationDispatcher;

	@Override
	public void sendInAppNotification(Long recipientId, NotificationType type, String title, String content, Long referenceId, String referenceType) {
		// NCL-14-CN-002: ap dung cau hinh nhan thong bao (bat/tat theo nhom, nhan ngay hoac gop
		// cuoi ngay) truoc khi luu — tat ca noi goi sendInAppNotification hien co (timesheet,
		// invoice, profitability, portal...) deu tu dong duoc gate qua day, khong can sua tung noi.
		notificationDispatcher.dispatch(recipientId, type, title, content, referenceId, referenceType);
	}

	@Override
	public List<NotificationRes> getUnreadNotifications(Long recipientId) {
		return notificationRepository.findByRecipientIdAndIsReadFalseOrderBySentAtDesc(recipientId)
				.stream()
				.map(notificationMapper::toResponse)
				.toList();
	}

	@Override
	public List<NotificationRes> listNotifications(Long recipientId, boolean unreadOnly, Pageable pageable) {
		Page<Notification> page = unreadOnly
				? notificationRepository.findByRecipientIdAndIsReadFalse(recipientId, pageable)
				: notificationRepository.findByRecipientId(recipientId, pageable);
		return page.stream().map(notificationMapper::toResponse).toList();
	}

	@Override
	public void markAsRead(Long recipientId, List<Long> notificationIds) {
		List<Notification> notifications = notificationRepository.findAllById(notificationIds);
		LocalDateTime now = LocalDateTime.now();
		int markedCount = 0;
		for (Notification notification : notifications) {
			if (notification.getRecipientId().equals(recipientId) && !Boolean.TRUE.equals(notification.getIsRead())) {
				notification.setIsRead(true);
				notification.setReadAt(now);
				markedCount++;
			}
		}
		notificationRepository.saveAll(notifications);

		// TC-03 (NCL-14-CN-001): ghi lai nguoi thuc hien, noi dung, thoi diem khi danh dau da doc.
		if (markedCount > 0) {
			auditLogService.record("Danh dau da doc thong bao", AuditTargetType.NOTIFICATION, recipientId,
					TARGET_LABEL, "Da danh dau da doc " + markedCount + " thong bao");
		}
	}

	@Override
	public long getUnreadCount(Long recipientId) {
		return notificationRepository.countUnreadByRecipientId(recipientId);
	}

	@Override
	public NotificationRes openNotification(Long recipientId, Long notificationId) {
		Notification notification = notificationRepository.findById(notificationId)
				.filter(n -> n.getRecipientId().equals(recipientId))
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay thong bao"));

		// NCL-14-CN-001 TC-02: mo thong bao se danh dau da doc (neu chua doc) truoc khi tra ve
		// de FE dieu huong toi ban ghi lien quan qua referenceId/referenceType.
		if (!Boolean.TRUE.equals(notification.getIsRead())) {
			notification.setIsRead(true);
			notification.setReadAt(LocalDateTime.now());
			notificationRepository.save(notification);

			auditLogService.record("Mo thong bao", AuditTargetType.NOTIFICATION, notification.getId(),
					TARGET_LABEL, "Da mo va danh dau da doc thong bao: " + notification.getTitle());
		}

		return notificationMapper.toResponse(notification);
	}
}