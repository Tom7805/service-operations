package com.serviceops.modules.notification;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.notification.dto.response.NotificationRes;
import com.serviceops.modules.notification.entity.Notification;
import com.serviceops.modules.notification.enums.NotificationChannel;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.enums.NotificationSeverity;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** NCL-14-CN-001: muc do, loc theo nhom, danh dau tat ca da doc. */
@ExtendWith(MockitoExtension.class)
class NotificationCenterExtrasTest {

	private static final Long RECIPIENT_ID = 10L;

	@Mock
	private NotificationRepository notificationRepository;
	@Mock
	private AuditLogService auditLogService;
	@Mock
	private NotificationDispatcher notificationDispatcher;

	private NotificationServiceImpl service;

	@BeforeEach
	void setUp() {
		service = new NotificationServiceImpl(notificationRepository, new NotificationMapper(), auditLogService,
				notificationDispatcher);
	}

	@Test
	void moiLoaiThongBaoDeuCoMucDo() {
		Arrays.stream(NotificationType.values()).forEach(type -> assertNotNull(type.severity(), type.name()));
		assertEquals(NotificationSeverity.CRITICAL, NotificationType.TASK_BUDGET_EXCEEDED.severity());
	}

	@Test
	void listTheoNhom_chiLayTypeThuocNhom_vaTraMucDoNhom() {
		Notification n = new Notification();
		n.setId(1L);
		n.setRecipientId(RECIPIENT_ID);
		n.setType(NotificationType.TASK_BUDGET_EXCEEDED);
		n.setChannel(NotificationChannel.IN_APP);
		n.setIsRead(false);
		n.setSentAt(LocalDateTime.now());
		PageRequest pageable = PageRequest.of(0, 20);
		List<NotificationType> projectTypes = NotificationType.ofGroup(NotificationGroup.PROJECT);
		when(notificationRepository.findByRecipientIdAndIsReadFalseAndTypeIn(RECIPIENT_ID, projectTypes, pageable))
				.thenReturn(new PageImpl<>(List.of(n)));

		List<NotificationRes> result = service.listNotifications(RECIPIENT_ID, true, NotificationGroup.PROJECT,
				pageable);

		assertEquals(1, result.size());
		assertEquals(NotificationGroup.PROJECT, result.get(0).notificationGroup());
		assertEquals(NotificationSeverity.CRITICAL, result.get(0).severity());
	}

	@Test
	void markAllAsRead_coThayDoi_ghiNhatKy() {
		when(notificationRepository.markAllReadByRecipientId(eq(RECIPIENT_ID), any())).thenReturn(5);

		assertEquals(5, service.markAllAsRead(RECIPIENT_ID));
		verify(auditLogService).record(anyString(), eq(AuditTargetType.NOTIFICATION), eq(RECIPIENT_ID), anyString(),
				anyString());
	}

	@Test
	void markAllAsRead_khongCoGiDeDoi_khongGhiNhatKy() {
		when(notificationRepository.markAllReadByRecipientId(eq(RECIPIENT_ID), any())).thenReturn(0);

		assertEquals(0, service.markAllAsRead(RECIPIENT_ID));
		verify(auditLogService, never()).record(anyString(), any(), anyLong(), anyString(), anyString());
	}
}
