package com.serviceops.modules.identity.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CurrentUserRes {
    private final Long id;
    private final String fullName;
    private final String email;
}
