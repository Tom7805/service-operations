package com.serviceops.modules.notification.service.impl;

import com.serviceops.modules.notification.entity.NotificationDedupKey;
import com.serviceops.modules.notification.repository.NotificationDedupKeyRepository;
import com.serviceops.modules.notification.service.NotificationDeduplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationDeduplicationServiceImpl implements NotificationDeduplicationService {

	private final NotificationDedupKeyRepository notificationDedupKeyRepository;
	private final Clock clock;

	@Override
	public boolean tryClaim(String dedupKey) {
		if (notificationDedupKeyRepository.existsByDedupKey(dedupKey)) {
			return false;
		}

		NotificationDedupKey key = new NotificationDedupKey();
		key.setDedupKey(dedupKey);
		key.setCreatedAt(LocalDateTime.now(clock));
		try {
			notificationDedupKeyRepository.save(key);
			return true;
		} catch (DataIntegrityViolationException concurrentDuplicate) {
			// Chot chan cuoi cua QTN-27: mot luot chay khac da chiem dung key nay giua luc
			// existsByDedupKey kiem tra va save() nay ghi — giong chot chan trong DunningServiceImpl.
			return false;
		}
	}
}
