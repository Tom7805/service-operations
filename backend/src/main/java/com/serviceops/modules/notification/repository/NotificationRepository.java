package com.serviceops.modules.notification.repository;

import com.serviceops.modules.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

	List<Notification> findByRecipientIdAndIsReadFalseOrderBySentAtDesc(Long recipientId);

	Page<Notification> findByRecipientId(Long recipientId, Pageable pageable);

	Page<Notification> findByRecipientIdAndIsReadFalse(Long recipientId, Pageable pageable);

	@Query("SELECT COUNT(n) FROM Notification n WHERE n.recipientId = :recipientId AND n.isRead = false")
	long countUnreadByRecipientId(@Param("recipientId") Long recipientId);

	List<Notification> findByRecipientIdAndSentAtAfter(Long recipientId, LocalDateTime since);

	List<Notification> findByReferenceIdAndReferenceType(Long referenceId, String referenceType);
}