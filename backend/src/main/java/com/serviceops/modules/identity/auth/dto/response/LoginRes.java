package com.serviceops.modules.identity.auth.dto.response;

import lombok.Getter;

import java.util.List;

@Getter
public class LoginRes {

    private String accessToken;
    private String tokenType;
    private Long userId;
    private String username;
    private String fullName;
    private List<String> roles;
    private boolean requiresTwoFactor;
    private String challengeToken;

    public LoginRes(String accessToken, String tokenType, Long userId, String username,
                    String fullName, List<String> roles) {
        this(accessToken, tokenType, userId, username, fullName, roles, false, null);
    }

    public LoginRes(String accessToken, String tokenType, Long userId, String username,
                    String fullName, List<String> roles, boolean requiresTwoFactor,
                    String challengeToken) {
        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.userId = userId;
        this.username = username;
        this.fullName = fullName;
        this.roles = roles;
        this.requiresTwoFactor = requiresTwoFactor;
        this.challengeToken = challengeToken;
    }
}
