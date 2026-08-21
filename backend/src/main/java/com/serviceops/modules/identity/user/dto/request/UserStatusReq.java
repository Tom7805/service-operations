package com.serviceops.modules.identity.user.dto.request;

import com.serviceops.modules.identity.user.enums.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UserStatusReq(@NotNull(message = "Trang thai khong duoc de trong") UserStatus status) {}
