package com.serviceops.modules.notification.service.impl;

import com.serviceops.modules.notification.entity.NotificationAlertDedupLog;
import com.serviceops.modules.notification.entity.NotificationAlertState;
import com.serviceops.modules.notification.entity.NotificationDedupConfig;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationAlertDedupLogRepository;
import com.serviceops.modules.notification.repository.NotificationAlertStateRepository;
import com.serviceops.modules.notification.repository.NotificationDedupConfigRepository;
import com.serviceops.modules.notification.service.NotificationAntiDuplicateService;
import com.serviceops.modules.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationAntiDuplicateServiceImpl implements NotificationAntiDuplicateService {

	/** Chi TASK_BUDGET_EXCEEDED dung co che nay trong pham vi NCL-14-CN-003 (xem NotificationType). */
	private static final Set<NotificationType> SUPPORTED_EVENT_TYPES = Set.of(NotificationType.TASK_BUDGET_EXCEEDED);

	private final NotificationDedupConfigRepository notificationDedupConfigRepository;
	private final NotificationAlertStateRepository notificationAlertStateRepository;
	private final NotificationAlertDedupLogRepository notificationAlertDedupLogRepository;
	private final NotificationService notificationService;
	private final Clock clock;

	@Override
	public Set<NotificationType> supportedEventTypes() {
		return SUPPORTED_EVENT_TYPES;
	}

	@Override
	public List<Long> evaluateAndNotify(NotificationType eventType, Long referenceId, List<Long> candidateRecipientIds,
			boolean breached, String title, String content) {
		List<Long> toNotify = resolveRecipientsToNotify(eventType, referenceId, candidateRecipientIds, breached);
		for (Long recipientId : toNotify) {
			notificationService.sendInAppNotification(recipientId, eventType, title, content, referenceId, null);
		}
		return toNotify;
	}

	@Override
	public List<Long> resolveRecipientsToNotify(NotificationType eventType, Long referenceId,
			List<Long> candidateRecipientIds, boolean breached) {
		NotificationAlertState state = notificationAlertStateRepository
				.findByEventTypeAndReferenceId(eventType, referenceId)
				.orElseGet(() -> newState(eventType, referenceId));

		if (!breached) {
			// TC-02 (nhanh thoat nguong): ban ghi da tro lai binh thuong -> tat trang thai, khong
			// gui gi ca; lan vuot nguong ke tiep se duoc coi la mot dot canh bao moi.
			if (Boolean.TRUE.equals(state.getActive())) {
				state.setActive(false);
				notificationAlertStateRepository.save(state);
			}
			return List.of();
		}

		if (candidateRecipientIds == null || candidateRecipientIds.isEmpty()) {
			return List.of();
		}

		NotificationDedupConfig config = notificationDedupConfigRepository.findByEventType(eventType).orElse(null);
		boolean dedupEnabled = config == null || Boolean.TRUE.equals(config.getDedupEnabled());
		if (!dedupEnabled) {
			// Cau hinh tat chong trung cho loai su kien nay -> luon gui, khong chiem khoa.
			return List.copyOf(candidateRecipientIds);
		}

		LocalDateTime now = LocalDateTime.now(clock);
		boolean newEpisode = !Boolean.TRUE.equals(state.getActive()) || cooldownElapsed(state, config, now);
		if (newEpisode) {
			// TC-02: thoat roi vuot nguong lai (hoac het cooldown ma van vuot) -> dot canh bao moi.
			state.setEpisodeNo(state.getEpisodeNo() + 1);
		}
		state.setActive(true);
		state.setLastAlertAt(now);
		state = saveState(state, eventType, referenceId);

		Integer episodeNo = state.getEpisodeNo();
		return candidateRecipientIds.stream()
				.filter(recipientId -> tryClaim(eventType, referenceId, recipientId, episodeNo))
				.toList();
	}

	/**
	 * Luu trang thai; neu day la ban ghi MOI (lan dau vuot nguong) va mot luot ra soat khac da
	 * chiem dung (event_type, reference_id) nay giua luc doc va luu (race condition) -> doc lai
	 * ban ghi ma luot do da luu de tiep tuc (dung episodeNo thuc te trong DB), khong nem loi len
	 * tren. Giong chot chan cua {@link #tryClaim}.
	 */
	private NotificationAlertState saveState(NotificationAlertState state, NotificationType eventType, Long referenceId) {
		try {
			return notificationAlertStateRepository.save(state);
		} catch (DataIntegrityViolationException concurrentInsert) {
			return notificationAlertStateRepository.findByEventTypeAndReferenceId(eventType, referenceId)
					.orElseThrow(() -> concurrentInsert);
		}
	}

	/** Het cooldown ma van dang vuot nguong -> coi nhu mot dot nhac lai (dung lai co che tang episodeNo). */
	private boolean cooldownElapsed(NotificationAlertState state, NotificationDedupConfig config, LocalDateTime now) {
		if (config == null || config.getCooldownHours() == null || state.getLastAlertAt() == null) {
			return false;
		}
		return Duration.between(state.getLastAlertAt(), now).toHours() >= config.getCooldownHours();
	}

	private boolean tryClaim(NotificationType eventType, Long referenceId, Long recipientId, Integer episodeNo) {
		if (notificationAlertDedupLogRepository.existsByEventTypeAndReferenceIdAndRecipientIdAndEpisodeNo(
				eventType, referenceId, recipientId, episodeNo)) {
			return false; // TC-01: da gui cho nguoi nay o dot nay roi.
		}
		NotificationAlertDedupLog log = new NotificationAlertDedupLog();
		log.setEventType(eventType);
		log.setReferenceId(referenceId);
		log.setRecipientId(recipientId);
		log.setEpisodeNo(episodeNo);
		log.setCreatedAt(LocalDateTime.now(clock));
		try {
			notificationAlertDedupLogRepository.save(log);
			return true;
		} catch (DataIntegrityViolationException concurrentDuplicate) {
			// Chot chan cuoi: mot luot ra soat khac da chiem dung khoa nay giua luc exists() kiem
			// tra va save() nay ghi — giong NotificationDeduplicationServiceImpl.
			return false;
		}
	}

	private NotificationAlertState newState(NotificationType eventType, Long referenceId) {
		NotificationAlertState state = new NotificationAlertState();
		state.setEventType(eventType);
		state.setReferenceId(referenceId);
		state.setActive(false);
		state.setEpisodeNo(0);
		return state;
	}
}
