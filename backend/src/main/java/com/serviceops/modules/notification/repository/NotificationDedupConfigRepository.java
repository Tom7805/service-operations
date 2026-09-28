package com.serviceops.modules.notification.repository;

import com.serviceops.modules.notification.entity.NotificationDedupConfig;
import com.serviceops.modules.notification.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationDedupConfigRepository extends JpaRepository<NotificationDedupConfig, Long> {

	Optional<NotificationDedupConfig> findByEventType(NotificationType eventType);
}
