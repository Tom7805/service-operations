package com.serviceops.modules.identity.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordReq {

    @NotBlank(message = "Thiếu mã khôi phục mật khẩu")
    private String token;

    @NotBlank(message = "Vui lòng nhập mật khẩu mới")
    private String newPassword;
}
