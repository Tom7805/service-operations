package com.serviceops.common.api;

import java.time.Instant;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

/**
 * Định dạng lỗi trả về thống nhất cho toàn bộ API, dùng bởi GlobalExceptionHandler.
 */
@Getter
@Builder
public class ErrorResponse {
    private final Instant timestamp;
    private final int status;
    private final String errorCode;
    private final String message;
    private final String path;
    private final List<FieldError> fieldErrors;
}
