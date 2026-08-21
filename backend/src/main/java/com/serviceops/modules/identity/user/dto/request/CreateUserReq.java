package com.serviceops.modules.identity.user.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateUserReq(
        @NotBlank(message = "Ten tai khoan khong duoc de trong")
        @Size(max = 100, message = "Ten tai khoan khong qua 100 ky tu")
        String username,
        @NotBlank(message = "Mat khau khong duoc de trong")
        @Size(min = 8, max = 100, message = "Mat khau phai tu 8 den 100 ky tu")
        String password,
        @NotBlank(message = "Ho ten khong duoc de trong")
        @Size(max = 255, message = "Ho ten khong qua 255 ky tu")
        String fullName,
        @Email(message = "Email khong hop le")
        @Size(max = 255, message = "Email khong qua 255 ky tu")
        String email,
        Long departmentId,
        @NotEmpty(message = "Phai chon it nhat mot vai tro")
        List<@NotBlank(message = "Ma vai tro khong duoc de trong") String> roleCodes,
        String scopeType
) {}
