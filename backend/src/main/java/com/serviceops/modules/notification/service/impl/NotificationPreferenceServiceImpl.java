package com.serviceops.modules.notification.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.notification.dto.request.NotificationPreferenceReq;
import com.serviceops.modules.notification.dto.response.NotificationPreferenceRes;
import com.serviceops.modules.notification.entity.NotificationPreference;
import com.serviceops.modules.notification.enums.NotificationFrequency;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.repository.NotificationPreferenceRepository;
import com.serviceops.modules.notification.service.NotificationPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationPreferenceServiceImpl implements NotificationPreferenceService {

	private static final String TARGET_LABEL = "Cau hinh nhan thong bao";

	private final NotificationPreferenceRepository notificationPreferenceRepository;
	private final AuditLogService auditLogService;
	private final Clock clock;

	@Override
	@Transactional(readOnly = true)
	public List<NotificationPreferenceRes> getPreferences(Long userId) {
		Map<NotificationGroup, NotificationPreference> saved = notificationPreferenceRepository.findByUserId(userId)
				.stream()
				.collect(Collectors.toMap(NotificationPreference::getNotificationGroup, p -> p));

		return Arrays.stream(NotificationGroup.values())
				.map(group -> {
					NotificationPreference pref = saved.get(group);
					return pref != null
							? new NotificationPreferenceRes(group, pref.getEnabled(), pref.getFrequency())
							: new NotificationPreferenceRes(group, true, NotificationFrequency.IMMEDIATE);
				})
				.toList();
	}

	@Override
	public void updatePreferences(Long userId, NotificationPreferenceReq request) {
		LocalDateTime now = LocalDateTime.now(clock);
		for (NotificationPreferenceReq.Item item : request.preferences()) {
			NotificationPreference pref = notificationPreferenceRepository
					.findByUserIdAndNotificationGroup(userId, item.notificationGroup())
					.orElseGet(() -> {
						NotificationPreference created = new NotificationPreference();
						created.setUserId(userId);
						created.setNotificationGroup(item.notificationGroup());
						return created;
					});
			pref.setEnabled(item.enabled());
			pref.setFrequency(item.frequency());
			pref.setUpdatedAt(now);
			notificationPreferenceRepository.save(pref);
		}

		auditLogService.record("Cap nhat cau hinh nhan thong bao", AuditTargetType.NOTIFICATION, userId,
				TARGET_LABEL, "Da cap nhat " + request.preferences().size() + " nhom thong bao");
	}

	@Override
	@Transactional(readOnly = true)
	public NotificationPreferenceRes resolve(Long userId, NotificationGroup notificationGroup) {
		return notificationPreferenceRepository.findByUserIdAndNotificationGroup(userId, notificationGroup)
				.map(pref -> new NotificationPreferenceRes(notificationGroup, pref.getEnabled(), pref.getFrequency()))
				.orElse(new NotificationPreferenceRes(notificationGroup, true, NotificationFrequency.IMMEDIATE));
	}
}
