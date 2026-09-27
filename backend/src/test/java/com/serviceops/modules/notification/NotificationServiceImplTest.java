package com.serviceops.modules.notification;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.notification.dto.response.NotificationRes;
import com.serviceops.modules.notification.entity.Notification;
import com.serviceops.modules.notification.enums.NotificationChannel;
import com.serviceops.modules.notification.enums.NotificationTargetType;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.mapper.NotificationMapper;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationDispatcher;
import com.serviceops.modules.notification.service.impl.NotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test cho phan con thieu cua trung tam thong bao (NCL-14-CN-001): ghi audit log
 * (TC-03) va mo thong bao de dieu huong toi ban ghi lien quan (TC-02).
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

	private static final Long RECIPIENT_ID = 10L;

	@Mock
	private NotificationRepository notificationRepository;
	@Mock
	private AuditLogService auditLogService;
	@Mock
	private NotificationDispatcher notificationDispatcher;

	private NotificationServiceImpl notificationService;

	@BeforeEach
	void setUp() {
		notificationService = new NotificationServiceImpl(notificationRepository, new NotificationMapper(),
				auditLogService, notificationDispatcher);
	}

	private Notification buildNotification(Long id, boolean read) {
		Notification notification = new Notification();
		notification.setId(id);
		notification.setRecipientId(RECIPIENT_ID);
		notification.setType(NotificationType.PROJECT_MILESTONE_DUE);
		notification.setTitle("Cong viec vuot ngan sach");
		notification.setContent("Cong viec X da vuot ngan sach du kien");
		notification.setChannel(NotificationChannel.IN_APP);
		notification.setReferenceId(99L);
		notification.setReferenceType("TASK");
		notification.setIsRead(read);
		notification.setSentAt(LocalDateTime.now());
		return notification;
	}

	@Test
	void openNotification_chuaDoc_danhDauDaDocVaGhiAuditLog() {
		Notification notification = buildNotification(1L, false);
		when(notificationRepository.findById(1L)).thenReturn(Optional.of(notification));

		NotificationRes res = notificationService.openNotification(RECIPIENT_ID, 1L);

		assertTrue(res.isRead());
		assertEquals(99L, res.referenceId());
		assertEquals("TASK", res.referenceType());
		// Rule 2: PROJECT_MILESTONE_DUE luon suy ra targetType = PROJECT du referenceType ghi gi.
		assertEquals(NotificationTargetType.PROJECT, res.targetType());
		verify(notificationRepository, times(1)).save(notification);
		verify(auditLogService, times(1)).record(
				contains("Mo thong bao"), eq(AuditTargetType.NOTIFICATION), eq(1L), any(), any());
	}

	@Test
	void openNotification_daDocRoi_khongLuuLaiVaKhongGhiAuditLog() {
		Notification notification = buildNotification(2L, true);
		when(notificationRepository.findById(2L)).thenReturn(Optional.of(notification));

		notificationService.openNotification(RECIPIENT_ID, 2L);

		verify(notificationRepository, never()).save(any());
		verify(auditLogService, never()).record(any(), any(), any(), any(), any());
	}

	@Test
	void openNotification_khongThuocVeNguoiDung_nemLoiKhongTimThay() {
		Notification notification = buildNotification(3L, false);
		notification.setRecipientId(999L);
		when(notificationRepository.findById(3L)).thenReturn(Optional.of(notification));

		BusinessRuleException ex = assertThrows(BusinessRuleException.class,
				() -> notificationService.openNotification(RECIPIENT_ID, 3L));
		assertEquals(ErrorCode.RESOURCE_NOT_FOUND, ex.getErrorCode());
		verify(auditLogService, never()).record(any(), any(), any(), any(), any());
	}

	@Test
	void openNotification_khongTonTai_nemLoiKhongTimThay() {
		when(notificationRepository.findById(4L)).thenReturn(Optional.empty());

		assertThrows(BusinessRuleException.class, () -> notificationService.openNotification(RECIPIENT_ID, 4L));
	}

	@Test
	void markAsRead_coThongBaoChuaDoc_ghiMotAuditLogChoCaLuot() {
		Notification unread1 = buildNotification(5L, false);
		Notification unread2 = buildNotification(6L, false);
		when(notificationRepository.findAllById(List.of(5L, 6L))).thenReturn(List.of(unread1, unread2));

		notificationService.markAsRead(RECIPIENT_ID, List.of(5L, 6L));

		assertTrue(unread1.getIsRead());
		assertTrue(unread2.getIsRead());
		verify(notificationRepository, times(1)).saveAll(List.of(unread1, unread2));
		verify(auditLogService, times(1)).record(
				contains("Danh dau da doc"), eq(AuditTargetType.NOTIFICATION), eq(RECIPIENT_ID), any(), contains("2 thong bao"));
	}

	@Test
	void markAsRead_khongCoThongBaoNaoDuocDanhDauMoi_khongGhiAuditLog() {
		Notification alreadyRead = buildNotification(7L, true);
		when(notificationRepository.findAllById(List.of(7L))).thenReturn(List.of(alreadyRead));

		notificationService.markAsRead(RECIPIENT_ID, List.of(7L));

		verify(auditLogService, never()).record(any(), any(), anyLong(), any(), any());
	}

	@Test
	void markAsRead_thongBaoKhongThuocVeNguoiDung_boQuaKhongDanhDauVaKhongGhiAuditLog() {
		Notification other = buildNotification(8L, false);
		other.setRecipientId(999L);
		when(notificationRepository.findAllById(List.of(8L))).thenReturn(List.of(other));

		notificationService.markAsRead(RECIPIENT_ID, List.of(8L));

		assertEquals(Boolean.FALSE, other.getIsRead());
		verify(auditLogService, never()).record(any(), any(), any(), any(), any());
	}

	/**
	 * Rule 1/5: du referenceType cua kieu DUNNING_REMINDER trong thuc te la mot khoa chong-trung
	 * dang chuoi ghep (VD "Dunning:5:FIRST_REMINDER:2026-09-01", xem DunningServiceImpl), targetType
	 * van suy dung ra INVOICE vi no duoc tinh tu NotificationType chu khong tu referenceType —
	 * ap dung duoc ngay ca cho thong bao da luu tu truoc ma khong can migrate du lieu.
	 */
	@Test
	void openNotification_referenceTypeLaKhoaChongTrung_targetTypeVanSuyDungTuNotificationType() {
		Notification notification = buildNotification(9L, false);
		notification.setType(NotificationType.DUNNING_REMINDER);
		notification.setReferenceType("Dunning:5:FIRST_REMINDER:2026-09-01");
		when(notificationRepository.findById(9L)).thenReturn(Optional.of(notification));

		NotificationRes res = notificationService.openNotification(RECIPIENT_ID, 9L);

		assertEquals(NotificationTargetType.INVOICE, res.targetType());
	}
}
