package com.serviceops.common.api;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Mô tả lỗi xác thực dữ liệu của một trường cụ thể trong request.
 */
@Getter
@AllArgsConstructor
public class FieldError {
    private final String field;
    private final String message;
}
