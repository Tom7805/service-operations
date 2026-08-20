package com.serviceops.modules.identity.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class LoginRes {

    private String accessToken;
    private String tokenType;
    private Long userId;
    private String username;
    private String fullName;
    private List<String> roles;
}
