package com.serviceops.common.audit;

/**
 * Ghi nhật ký thao tác. Interface tách riêng để các service nghiệp vụ không
 * phụ thuộc trực tiếp vào cách lưu trữ (hiện tại là bảng audit_logs).
 */
public interface AuditLogService {

    void record(Long actorUserId, String actorDisplayName, AuditAction action,
                String targetType, Long targetId, String detail);
}
