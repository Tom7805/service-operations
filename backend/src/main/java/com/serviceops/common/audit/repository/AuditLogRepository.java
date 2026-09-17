package com.serviceops.common.audit.repository;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

	/**
	 * Bản ghi nhật ký sớm nhất của một đối tượng cụ thể — dùng để tra "ai đã tạo/thay đổi" một
	 * bản ghi nghiệp vụ (ví dụ một dòng đơn giá) mà không cần bảng lịch sử riêng, tái dùng
	 * {@code audit_logs} đã có sẵn (NCL-07-CN-007).
	 */
	Optional<AuditLog> findFirstByTargetTypeAndTargetIdOrderByPerformedAtAsc(AuditTargetType targetType, Long targetId);
}
