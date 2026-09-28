package com.serviceops.modules.notification.repository;

import com.serviceops.modules.notification.entity.NotificationAlertState;
import com.serviceops.modules.notification.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationAlertStateRepository extends JpaRepository<NotificationAlertState, Long> {

	Optional<NotificationAlertState> findByEventTypeAndReferenceId(NotificationType eventType, Long referenceId);
}
