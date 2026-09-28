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

	/** NCL-14-CN-001: loc theo nhom thong bao (group -> tap type). */
	Page<Notification> findByRecipientIdAndTypeIn(Long recipientId,
			java.util.Collection<com.serviceops.modules.notification.enums.NotificationType> types, Pageable pageable);

	Page<Notification> findByRecipientIdAndIsReadFalseAndTypeIn(Long recipientId,
			java.util.Collection<com.serviceops.modules.notification.enums.NotificationType> types, Pageable pageable);

	/** NCL-14-CN-001: danh dau tat ca thong bao chua doc cua chinh minh la da doc; tra ve so dong da doi. */
	@org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
	@Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt"
			+ " WHERE n.recipientId = :recipientId AND n.isRead = false")
	int markAllReadByRecipientId(@Param("recipientId") Long recipientId, @Param("readAt") LocalDateTime readAt);

	@Query("SELECT COUNT(n) FROM Notification n WHERE n.recipientId = :recipientId AND n.isRead = false")
	long countUnreadByRecipientId(@Param("recipientId") Long recipientId);

	List<Notification> findByRecipientIdAndSentAtAfter(Long recipientId, LocalDateTime since);

	List<Notification> findByReferenceIdAndReferenceType(Long referenceId, String referenceType);

	/** QTN-27: kiem tra da gui thong bao loai nay cho referenceType nay chua — chong gui trung. */
	boolean existsByRecipientIdAndTypeAndReferenceType(
			Long recipientId, com.serviceops.modules.notification.enums.NotificationType type, String referenceType);
}