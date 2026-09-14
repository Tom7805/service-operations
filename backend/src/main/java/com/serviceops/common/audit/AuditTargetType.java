package com.serviceops.common.audit;

/**
 * Loại đối tượng nghiệp vụ mà một bản ghi nhật ký ({@link com.serviceops.common.audit.entity.AuditLog})
 * đang mô tả thao tác — dùng để lọc trên trang Nhật ký tổng hợp.
 */
public enum AuditTargetType {
	USER,
	ROLE_SCOPE,
	TWO_FACTOR,
	DEPARTMENT,
	CUSTOMER,
	MASKING,
	GENERAL
}
