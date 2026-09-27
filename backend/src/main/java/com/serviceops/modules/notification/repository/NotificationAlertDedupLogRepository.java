package com.serviceops.modules.notification.repository;

import com.serviceops.modules.notification.entity.NotificationAlertDedupLog;
import com.serviceops.modules.notification.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationAlertDedupLogRepository extends JpaRepository<NotificationAlertDedupLog, Long> {

	/** QTN-27-TC-01: da gui cho recipient nay o dung dot canh bao (episode) nay chua. */
	boolean existsByEventTypeAndReferenceIdAndRecipientIdAndEpisodeNo(
			NotificationType eventType, Long referenceId, Long recipientId, Integer episodeNo);
}
