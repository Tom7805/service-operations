package com.serviceops.common.audit;

/**
 * Loại thao tác được ghi vào nhật ký hệ thống (đáp ứng tiêu chí "Lưu lịch sử"
 * lặp lại ở hầu hết user story trong backlog). Mỗi module bổ sung thêm giá trị
 * của mình khi triển khai story tương ứng.
 */
public enum AuditAction {
    LOGIN_SUCCESS,
    LOGIN_FAILED,
    CHANGE_PASSWORD,
    FORGOT_PASSWORD_REQUEST,
    RESET_PASSWORD,
    ACCESS_DENIED
}
