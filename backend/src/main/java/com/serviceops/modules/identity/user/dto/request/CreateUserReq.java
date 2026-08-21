package com.serviceops.modules.identity.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateUserReq(
        @NotBlank(message = "Tên tài khoản không được để trống")
        @Size(max = 100, message = "Tên tài khoản không được quá 100 ký tự")
        String username,
        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 8, max = 100, message = "Mật khẩu phải có ít nhất 8 ký tự")
        String password,
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255, message = "Họ tên không được quá 255 ký tự")
        String fullName,
        @Email(message = "Email không hợp lệ")
        @Size(max = 255, message = "Email không được quá 255 ký tự")
        String email,
        Long departmentId,
        @NotEmpty(message = "Phải chọn ít nhất một vai trò")
        List<@NotBlank(message = "Mã vai trò không được để trống") String> roleCodes,
        String scopeType
) {}
