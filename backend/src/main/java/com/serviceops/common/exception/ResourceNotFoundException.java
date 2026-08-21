package com.serviceops.common.exception;

/**
 * Ném ra khi không tìm thấy bản ghi được yêu cầu.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
