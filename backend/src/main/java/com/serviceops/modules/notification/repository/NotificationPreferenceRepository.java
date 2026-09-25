package com.serviceops.modules.notification.repository;

import com.serviceops.modules.notification.entity.NotificationPreference;
import com.serviceops.modules.notification.enums.NotificationGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {

	List<NotificationPreference> findByUserId(Long userId);

	Optional<NotificationPreference> findByUserIdAndNotificationGroup(Long userId, NotificationGroup notificationGroup);
}
