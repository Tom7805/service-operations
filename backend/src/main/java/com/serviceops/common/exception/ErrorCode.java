package com.serviceops.common.exception;

/**
 * Mã lỗi nghiệp vụ dùng chung. Mỗi module bổ sung thêm mã của mình khi cần.
 */
public enum ErrorCode {
    VALIDATION_ERROR,
    RESOURCE_NOT_FOUND,
    BUSINESS_RULE_VIOLATION,
    UNAUTHENTICATED,
    FORBIDDEN,
    INVALID_CREDENTIALS,
    RESET_TOKEN_EXPIRED,
    INTERNAL_ERROR
}
