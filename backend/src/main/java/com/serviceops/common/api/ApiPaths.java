package com.serviceops.common.api;

/**
 * Hằng số đường dẫn API dùng chung, tránh lặp chuỗi giữa các controller.
 * Mỗi module bổ sung thêm hằng số của mình vào đây khi triển khai.
 */
public final class ApiPaths {

    public static final String API_V1 = "/api/v1";

    // ---- Định danh & xác thực (NCL-01) ----
    public static final String AUTH = API_V1 + "/auth";
    public static final String AUTH_LOGIN = AUTH + "/login";
    public static final String AUTH_CHANGE_PASSWORD = AUTH + "/change-password";
    public static final String AUTH_FORGOT_PASSWORD = AUTH + "/forgot-password";
    public static final String AUTH_RESET_PASSWORD = AUTH + "/reset-password";
    public static final String AUTH_RESET_PASSWORD_VALIDATE = AUTH_RESET_PASSWORD + "/validate";

    private ApiPaths() {
    }
}
