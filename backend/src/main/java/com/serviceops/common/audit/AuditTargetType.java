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
	GENERAL,
	TIMESHEET,

	/** Chi phi du an va chi phi chung (NCL-08-CN-005). */
	EXPENSE,

	/** Hoa don va thanh toan (Epic NCL-10). */
	INVOICE,

	/** Phieu nghiem thu va san pham ban giao (Epic NCL-12). */
	ACCEPTANCE,

	/** Tai khoan cong khach hang va cac luot khach hang tra cuu tren cong (Epic NCL-13). */
	PORTAL,

	/** Trung tam thong bao trong he thong — danh dau da doc, mo thong bao (NCL-14-CN-001). */
	NOTIFICATION
}
