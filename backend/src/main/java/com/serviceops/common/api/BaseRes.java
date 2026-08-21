package com.serviceops.common.api;

import lombok.Getter;

/**
 * Bao bọc phản hồi API dùng chung cho toàn hệ thống: {success, message, data}.
 */
@Getter
public class BaseRes<T> {

    private final boolean success;
    private final String message;
    private final T data;

    private BaseRes(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    public static <T> BaseRes<T> ok(T data) {
        return new BaseRes<>(true, null, data);
    }

    public static <T> BaseRes<T> ok(String message, T data) {
        return new BaseRes<>(true, message, data);
    }

    public static BaseRes<Void> ok(String message) {
        return new BaseRes<>(true, message, null);
    }
}
