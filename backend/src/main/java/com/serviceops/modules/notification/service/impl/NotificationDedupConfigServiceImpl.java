package com.serviceops.modules.notification.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.notification.dto.request.NotificationDedupConfigReq;
import com.serviceops.modules.notification.dto.response.NotificationDedupConfigRes;
import com.serviceops.modules.notification.entity.NotificationDedupConfig;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationDedupConfigRepository;
import com.serviceops.modules.notification.service.NotificationDedupConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Cau hinh chong gui trung theo loai su kien (NCL-14-CN-003, QTN-27) — chi Quan tri vien (VT-07)
 * duoc sua (chan quyen o {@code NotificationDedupConfigController}, TC-03), moi thay doi deu ghi
 * Nhat ky he thong (TC-04).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationDedupConfigServiceImpl implements NotificationDedupConfigService {

	private static final String TARGET_LABEL = "Cau hinh chong gui trung thong bao";

	private final NotificationDedupConfigRepository notificationDedupConfigRepository;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	@Transactional(readOnly = true)
	public List<NotificationDedupConfigRes> getConfigs() {
		Map<NotificationType, NotificationDedupConfig> saved = notificationDedupConfigRepository.findAll().stream()
				.collect(Collectors.toMap(NotificationDedupConfig::getEventType, c -> c));

		return Arrays.stream(NotificationType.values())
				.filter(type -> type.group() != null)
				.map(type -> {
					NotificationDedupConfig config = saved.get(type);
					return config != null
							? new NotificationDedupConfigRes(type, config.getDedupEnabled(), config.getCooldownHours(),
									config.getUpdatedBy(), config.getUpdatedAt())
							: new NotificationDedupConfigRes(type, true, null, null, null);
				})
				.toList();
	}

	@Override
	public void updateConfig(NotificationType eventType, NotificationDedupConfigReq request) {
		NotificationDedupConfig config = notificationDedupConfigRepository.findByEventType(eventType)
				.orElseGet(() -> {
					NotificationDedupConfig created = new NotificationDedupConfig();
					created.setEventType(eventType);
					return created;
				});
		config.setDedupEnabled(request.dedupEnabled());
		config.setCooldownHours(request.cooldownHours());
		config.setUpdatedBy(currentUsername());
		config.setUpdatedAt(LocalDateTime.now(clock));
		notificationDedupConfigRepository.save(config);

		// TC-04: ghi lai nguoi thuc hien (tu dien boi AuditLogService), noi dung va thoi diem.
		auditLogService.record("Cap nhat cau hinh chong gui trung thong bao", AuditTargetType.NOTIFICATION, null,
				TARGET_LABEL, "Loai su kien " + eventType + ": dedupEnabled=" + request.dedupEnabled()
						+ ", cooldownHours=" + request.cooldownHours());
	}

	private String currentUsername() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		return auth != null ? auth.getName() : null;
	}
}
