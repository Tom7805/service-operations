package com.serviceops.modules.identity.user.dto.response;

import com.serviceops.modules.identity.user.enums.UserStatus;

import java.time.LocalDateTime;
import java.util.List;

public record UserRes(
        Long id,
        String username,
        String fullName,
        String email,
        Long departmentId,
        UserStatus status,
        List<String> roleCodes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
