package com.serviceops.common.api;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class BaseRes<T> {

    private boolean success;
    private String message;
    private T data;

    public static <T> BaseRes<T> ok(T data) {
        return new BaseRes<>(true, null, data);
    }

    public static <T> BaseRes<T> ok(String message, T data) {
        return new BaseRes<>(true, message, data);
    }
}
