package com.serviceops.modules.notification;

import com.serviceops.modules.notification.dto.response.NotificationPreferenceRes;
import com.serviceops.modules.notification.entity.Notification;
import com.serviceops.modules.notification.entity.NotificationDigestQueue;
import com.serviceops.modules.notification.enums.NotificationFrequency;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationDigestQueueRepository;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationPreferenceService;
import com.serviceops.modules.notification.service.impl.NotificationDispatcherImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-14-CN-002: NotificationDispatcher la diem chan duy nhat truoc khi luu thong bao — kiem tra
 * ca 3 nhanh (tat nhom, IMMEDIATE, DAILY_DIGEST) va truong hop type khong thuoc nhom nao.
 */
@ExtendWith(MockitoExtension.class)
class NotificationDispatcherTest {

	private static final Long RECIPIENT_ID = 7L;

	@Mock
	private NotificationPreferenceService notificationPreferenceService;
	@Mock
	private NotificationRepository notificationRepository;
	@Mock
	private NotificationDigestQueueRepository notificationDigestQueueRepository;

	private NotificationDispatcherImpl dispatcher;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-25T13:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		dispatcher = new NotificationDispatcherImpl(notificationPreferenceService, notificationRepository,
				notificationDigestQueueRepository, clock);
	}

	@Test
	void dispatch_nhomBiTat_khongLuuGiCa() {
		when(notificationPreferenceService.resolve(RECIPIENT_ID, NotificationGroup.INVOICE))
				.thenReturn(new NotificationPreferenceRes(NotificationGroup.INVOICE, false, NotificationFrequency.IMMEDIATE));

		dispatcher.dispatch(RECIPIENT_ID, NotificationType.DUNNING_REMINDER, "Hoa don qua han", "noi dung",
				5L, "Invoice");

		verify(notificationRepository, never()).save(any());
		verify(notificationDigestQueueRepository, never()).save(any());
	}

	@Test
	void dispatch_nhomBatImmediate_luuNgayVaoNotifications() {
		when(notificationPreferenceService.resolve(RECIPIENT_ID, NotificationGroup.TIMESHEET))
				.thenReturn(new NotificationPreferenceRes(NotificationGroup.TIMESHEET, true, NotificationFrequency.IMMEDIATE));

		dispatcher.dispatch(RECIPIENT_ID, NotificationType.TIMESHEET_SUBMITTED, "Bang cham cong moi",
				"noi dung", 10L, "Timesheet");

		verify(notificationDigestQueueRepository, never()).save(any());
		var captor = org.mockito.ArgumentCaptor.forClass(Notification.class);
		verify(notificationRepository, times(1)).save(captor.capture());
		Notification saved = captor.getValue();
		assertEquals(RECIPIENT_ID, saved.getRecipientId());
		assertEquals(NotificationType.TIMESHEET_SUBMITTED, saved.getType());
		assertEquals(10L, saved.getReferenceId());
		assertFalse(saved.getIsRead());
	}

	@Test
	void dispatch_nhomBatDailyDigest_dayVaoHangDoiKhongLuuVaoNotifications() {
		when(notificationPreferenceService.resolve(RECIPIENT_ID, NotificationGroup.ACCEPTANCE))
				.thenReturn(new NotificationPreferenceRes(NotificationGroup.ACCEPTANCE, true, NotificationFrequency.DAILY_DIGEST));

		dispatcher.dispatch(RECIPIENT_ID, NotificationType.ACCEPTANCE_DECIDED_ON_PORTAL, "Khach da xac nhan",
				"noi dung", 20L, "AcceptanceCertificate");

		verify(notificationRepository, never()).save(any());
		var captor = org.mockito.ArgumentCaptor.forClass(NotificationDigestQueue.class);
		verify(notificationDigestQueueRepository, times(1)).save(captor.capture());
		NotificationDigestQueue queued = captor.getValue();
		assertEquals(RECIPIENT_ID, queued.getRecipientId());
		assertEquals(NotificationGroup.ACCEPTANCE, queued.getNotificationGroup());
		assertEquals(NotificationType.ACCEPTANCE_DECIDED_ON_PORTAL, queued.getType());
		assertEquals(20L, queued.getReferenceId());
	}

	@Test
	void dispatch_typeKhongThuocNhomNao_luuNgayKhongTraCauHinh() {
		dispatcher.dispatch(RECIPIENT_ID, NotificationType.DAILY_DIGEST_SUMMARY, "Tong hop", "noi dung",
				null, null);

		verify(notificationPreferenceService, never()).resolve(any(), any());
		verify(notificationDigestQueueRepository, never()).save(any());
		verify(notificationRepository, times(1)).save(any());
	}
}
