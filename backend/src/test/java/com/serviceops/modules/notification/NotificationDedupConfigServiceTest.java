package com.serviceops.modules.notification;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.notification.dto.request.NotificationDedupConfigReq;
import com.serviceops.modules.notification.dto.response.NotificationDedupConfigRes;
import com.serviceops.modules.notification.entity.NotificationDedupConfig;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationDedupConfigRepository;
import com.serviceops.modules.notification.service.impl.NotificationDedupConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NCL-14-CN-003 (QTN-27): cau hinh chong gui trung theo loai su kien — mac dinh bat, khong
 * cooldown khi chua co ban ghi rieng (TC-03), va ghi Nhat ky he thong khi thay doi (TC-04).
 */
@ExtendWith(MockitoExtension.class)
class NotificationDedupConfigServiceTest {

	private static final NotificationType EVENT_TYPE = NotificationType.TASK_BUDGET_EXCEEDED;

	@Mock
	private NotificationDedupConfigRepository notificationDedupConfigRepository;
	@Mock
	private AuditLogService auditLogService;

	private NotificationDedupConfigServiceImpl configService;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(Instant.parse("2026-09-26T08:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		configService = new NotificationDedupConfigServiceImpl(notificationDedupConfigRepository, auditLogService, clock);
	}

	@Test
	void getConfigs_chuaCoBanGhiNao_traMacDinhBatKhongCooldown() {
		when(notificationDedupConfigRepository.findAll()).thenReturn(List.of());

		List<NotificationDedupConfigRes> result = configService.getConfigs();

		NotificationDedupConfigRes taskBudget = result.stream()
				.filter(r -> r.eventType() == EVENT_TYPE).findFirst().orElseThrow();
		assertTrue(taskBudget.dedupEnabled());
		assertNull(taskBudget.cooldownHours());
	}

	@Test
	void getConfigs_daCoBanGhiRieng_giuGiaTriDaLuu() {
		NotificationDedupConfig saved = new NotificationDedupConfig();
		saved.setEventType(EVENT_TYPE);
		saved.setDedupEnabled(false);
		saved.setCooldownHours(24);
		when(notificationDedupConfigRepository.findAll()).thenReturn(List.of(saved));

		List<NotificationDedupConfigRes> result = configService.getConfigs();

		NotificationDedupConfigRes taskBudget = result.stream()
				.filter(r -> r.eventType() == EVENT_TYPE).findFirst().orElseThrow();
		assertFalse(taskBudget.dedupEnabled());
		assertEquals(24, taskBudget.cooldownHours());
	}

	@Test
	void updateConfig_banGhiChuaTonTai_taoMoiVaGhiAuditLog() {
		when(notificationDedupConfigRepository.findByEventType(EVENT_TYPE)).thenReturn(Optional.empty());
		NotificationDedupConfigReq request = new NotificationDedupConfigReq(false, 12);

		configService.updateConfig(EVENT_TYPE, request);

		ArgumentCaptor<NotificationDedupConfig> captor = ArgumentCaptor.forClass(NotificationDedupConfig.class);
		verify(notificationDedupConfigRepository, times(1)).save(captor.capture());
		NotificationDedupConfig saved = captor.getValue();
		assertEquals(EVENT_TYPE, saved.getEventType());
		assertFalse(saved.getDedupEnabled());
		assertEquals(12, saved.getCooldownHours());

		verify(auditLogService, times(1)).record(
				contains("Cap nhat cau hinh chong gui trung thong bao"), eq(AuditTargetType.NOTIFICATION), any(), any(), any());
	}

	@Test
	void updateConfig_banGhiDaTonTai_capNhatTrenBanGhiCu() {
		NotificationDedupConfig existing = new NotificationDedupConfig();
		existing.setEventType(EVENT_TYPE);
		existing.setDedupEnabled(true);
		when(notificationDedupConfigRepository.findByEventType(EVENT_TYPE)).thenReturn(Optional.of(existing));
		NotificationDedupConfigReq request = new NotificationDedupConfigReq(true, 6);

		configService.updateConfig(EVENT_TYPE, request);

		assertEquals(6, existing.getCooldownHours());
		verify(notificationDedupConfigRepository, times(1)).save(existing);
	}
}
