package com.serviceops.modules.notification;

import com.serviceops.modules.notification.entity.Notification;
import com.serviceops.modules.notification.entity.NotificationDigestQueue;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationDigestQueueRepository;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationDeduplicationService;
import com.serviceops.modules.notification.service.impl.NotificationDigestServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-14-CN-002 TC-02: gop cac thong bao dang cho trong hang doi thanh mot ban tong hop duy nhat
 * cho moi (recipientId, notificationGroup); QTN-27 khong gop trung neu job chay lai trong cung
 * ngay (dedup key da bi chiem).
 */
@ExtendWith(MockitoExtension.class)
class NotificationDigestServiceTest {

	@Mock
	private NotificationDigestQueueRepository notificationDigestQueueRepository;
	@Mock
	private NotificationRepository notificationRepository;
	@Mock
	private NotificationDeduplicationService notificationDeduplicationService;

	private NotificationDigestServiceImpl digestService;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-25T13:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		digestService = new NotificationDigestServiceImpl(notificationDigestQueueRepository, notificationRepository,
				notificationDeduplicationService, clock);
		lenient().when(notificationDeduplicationService.tryClaim(any())).thenReturn(true);
	}

	private NotificationDigestQueue queueItem(Long recipientId, NotificationGroup group, String title, String content) {
		NotificationDigestQueue item = new NotificationDigestQueue();
		item.setRecipientId(recipientId);
		item.setNotificationGroup(group);
		item.setType(NotificationType.DUNNING_REMINDER);
		item.setTitle(title);
		item.setContent(content);
		item.setCreatedAt(LocalDateTime.now());
		return item;
	}

	@Test
	void runDailyDigest_hangDoiRong_khongTaoGiCa() {
		when(notificationDigestQueueRepository.findByCreatedAtBefore(any())).thenReturn(List.of());

		digestService.runDailyDigest();

		verify(notificationRepository, never()).save(any());
		verify(notificationDigestQueueRepository, never()).deleteAll(anyList());
	}

	@Test
	void runDailyDigest_nhieuItemCungRecipientVaGroup_gopThanhMotBanTongHopVaXoaHangDoi() {
		NotificationDigestQueue item1 = queueItem(7L, NotificationGroup.INVOICE, "Hoa don HD-102 toi han",
				"Con phai thu 15.000.000");
		NotificationDigestQueue item2 = queueItem(7L, NotificationGroup.INVOICE, "Hoa don HD-108 qua han",
				"Con phai thu 8.500.000");
		when(notificationDigestQueueRepository.findByCreatedAtBefore(any())).thenReturn(List.of(item1, item2));

		digestService.runDailyDigest();

		ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
		verify(notificationRepository, times(1)).save(captor.capture());
		Notification digest = captor.getValue();
		assertEquals(7L, digest.getRecipientId());
		assertEquals(NotificationType.DAILY_DIGEST_SUMMARY, digest.getType());
		assertTrue(digest.getTitle().contains("2"));
		assertTrue(digest.getContent().contains("HD-102"));
		assertTrue(digest.getContent().contains("HD-108"));

		verify(notificationDigestQueueRepository, times(1)).deleteAll(List.of(item1, item2));
	}

	@Test
	void runDailyDigest_haiNhomKhacNhauCungRecipient_taoHaiBanTongHopRieng() {
		NotificationDigestQueue timesheetItem = queueItem(7L, NotificationGroup.TIMESHEET, "Nhac nop bang cham cong",
				null);
		NotificationDigestQueue invoiceItem = queueItem(7L, NotificationGroup.INVOICE, "Hoa don toi han", null);
		when(notificationDigestQueueRepository.findByCreatedAtBefore(any()))
				.thenReturn(List.of(timesheetItem, invoiceItem));

		digestService.runDailyDigest();

		verify(notificationRepository, times(2)).save(any());
	}

	@Test
	void runDailyDigest_daGopTrongNgayHomNay_boQuaKhongTaoLaiVaKhongXoaHangDoi() {
		NotificationDigestQueue item = queueItem(7L, NotificationGroup.INVOICE, "Hoa don toi han", null);
		when(notificationDigestQueueRepository.findByCreatedAtBefore(any())).thenReturn(List.of(item));
		when(notificationDeduplicationService.tryClaim(any())).thenReturn(false);

		digestService.runDailyDigest();

		verify(notificationRepository, never()).save(any());
		verify(notificationDigestQueueRepository, never()).deleteAll(anyList());
	}
}
