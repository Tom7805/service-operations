package com.serviceops.modules.identity.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * NCL-01-CN-008-TC-01: người dùng đang đăng nhập nhập mật khẩu cũ và mật khẩu
 * mới hợp lệ. Việc "mật khẩu mới hợp lệ" được kiểm tra bởi PasswordPolicyValidator
 * ở tầng service, không đặt @Pattern cứng ở DTO để tránh trùng luật và lệch
 * thông báo lỗi giữa hai nơi.
 */
@Getter
@Setter
public class ChangePasswordReq {

    @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại")
    private String currentPassword;

    @NotBlank(message = "Vui lòng nhập mật khẩu mới")
    private String newPassword;
}
