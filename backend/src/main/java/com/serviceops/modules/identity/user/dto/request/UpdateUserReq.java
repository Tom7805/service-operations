package com.serviceops.modules.identity.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateUserReq(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255, message = "Họ tên không được quá 255 ký tự")
        String fullName,
        @Email(message = "Email không hợp lệ")
        @Size(max = 255, message = "Email không quá 255 ký tự")
        String email,
        Long departmentId,
        @Size(min = 8, max = 100, message = "Mật khẩu phải có ít nhất 8 ký tự")
        String password,
        List<@NotBlank(message = "Mã vai trò không được để trống") String> roleCodes,
        String scopeType
) {}
