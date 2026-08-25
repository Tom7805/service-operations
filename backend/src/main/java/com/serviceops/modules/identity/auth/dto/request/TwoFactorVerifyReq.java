package com.serviceops.modules.identity.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Yêu cầu xác thực mã một lần (OTP) để hoàn tất bước 2 của đăng nhập
 * (NCL-01-CN-009).
 *
 * <p>{@link #challengeToken} là mã định danh phiên trả về ở bước 1; {@link #otp}
 * là mã một lần người dùng nhận được.</p>
 */
@Getter
@Setter
public class TwoFactorVerifyReq {

    @NotBlank(message = "Vui lòng cung cấp mã xác thực")
    private String challengeToken;

    @NotBlank(message = "Vui lòng nhập mã một lần")
    private String otp;
}

