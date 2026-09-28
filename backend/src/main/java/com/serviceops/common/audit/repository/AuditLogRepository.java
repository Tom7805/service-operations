package com.serviceops.common.audit.repository;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

	/**
	 * Bản ghi nhật ký sớm nhất của một đối tượng cụ thể — dùng để tra "ai đã tạo/thay đổi" một
	 * bản ghi nghiệp vụ (ví dụ một dòng đơn giá) mà không cần bảng lịch sử riêng, tái dùng
	 * {@code audit_logs} đã có sẵn (NCL-07-CN-007).
	 */
	Optional<AuditLog> findFirstByTargetTypeAndTargetIdOrderByPerformedAtAsc(AuditTargetType targetType, Long targetId);

	/**
	 * Các bản ghi nhật ký do một người thực hiện, giới hạn theo tên hành động — dùng để dựng lại
	 * "lịch sử tôi vừa làm gì" ngay trên màn hình nghiệp vụ (ví dụ duyệt/từ chối bảng chấm công,
	 * NCL-06-CN-003/CN-004) mà không cần thêm bảng dữ liệu riêng.
	 */
	List<AuditLog> findByActorUserIdAndActionInOrderByPerformedAtDesc(Long actorUserId, Collection<String> actions,
			Pageable pageable);
}
