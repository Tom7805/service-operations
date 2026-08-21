package com.serviceops.common.exception;

import lombok.Getter;

/**
 * Ném ra khi một thao tác vi phạm quy tắc nghiệp vụ (QTN-xx) hoặc điều kiện
 * hợp lệ của dữ liệu đầu vào mà không thuộc lỗi validate cấu trúc thông thường.
 */
@Getter
public class BusinessRuleException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessRuleException(String message) {
        this(ErrorCode.BUSINESS_RULE_VIOLATION, message);
    }

    public BusinessRuleException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
