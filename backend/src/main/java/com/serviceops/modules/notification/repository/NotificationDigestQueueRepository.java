package com.serviceops.modules.notification.repository;

import com.serviceops.modules.notification.entity.NotificationDigestQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationDigestQueueRepository extends JpaRepository<NotificationDigestQueue, Long> {

	/** Chi lay item da nam trong hang doi truoc thoi diem job bat dau chay, tranh vo tinh gom
	 * ca item vua duoc dispatcher ghi them ngay trong luc job dang xu ly. */
	List<NotificationDigestQueue> findByCreatedAtBefore(LocalDateTime before);
}
