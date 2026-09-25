package com.serviceops.modules.notification.repository;

import com.serviceops.modules.notification.entity.NotificationDedupKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationDedupKeyRepository extends JpaRepository<NotificationDedupKey, Long> {

	boolean existsByDedupKey(String dedupKey);
}
