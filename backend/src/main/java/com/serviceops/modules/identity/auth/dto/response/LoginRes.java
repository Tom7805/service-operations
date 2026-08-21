package com.serviceops.modules.identity.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginRes {
    private final String accessToken;
    private final String tokenType;
    private final long expiresInMs;
    private final CurrentUserRes user;
}
