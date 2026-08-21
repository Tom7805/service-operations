package com.serviceops.modules.identity.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginReq {

    @NotBlank(message = "Vui lòng nhập tài khoản")
    @Email(message = "Tài khoản phải là địa chỉ email hợp lệ")
    private String email;

    @NotBlank(message = "Vui lòng nhập mật khẩu")
    private String password;
}
