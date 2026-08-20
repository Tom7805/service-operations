package com.serviceops.common.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class ErrorResponse {

    private boolean success;
    private String errorCode;
    private String message;
    private LocalDateTime timestamp;
    private List<FieldError> fieldErrors;

    public static ErrorResponse of(String errorCode, String message) {
        return ErrorResponse.builder()
                .success(false)
                .errorCode(errorCode)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
