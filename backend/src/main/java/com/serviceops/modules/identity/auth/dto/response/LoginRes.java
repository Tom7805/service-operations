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
    /** NCL-01-CN-009: true nếu bước 2 cần hiện mã QR để thiết lập app Authenticator lần đầu. */
    private boolean totpEnrollment;
    /** Chuỗi otpauth:// để vẽ QR — chỉ có giá trị khi {@link #totpEnrollment} = true. */
    private String otpauthUri;
    /** Khóa bí mật định dạng dễ đọc, dự phòng khi không quét được QR — chỉ có khi {@link #totpEnrollment} = true. */
    private String totpSecretForDisplay;

    public LoginRes(String accessToken, String tokenType, Long userId, String username,
                    String fullName, List<String> roles) {
        this(accessToken, tokenType, userId, username, fullName, roles, false, null, false, null, null);
    }

    public LoginRes(String accessToken, String tokenType, Long userId, String username,
                    String fullName, List<String> roles, boolean requiresTwoFactor,
                    String challengeToken) {
        this(accessToken, tokenType, userId, username, fullName, roles, requiresTwoFactor, challengeToken,
                false, null, null);
    }

    public LoginRes(String accessToken, String tokenType, Long userId, String username,
                    String fullName, List<String> roles, boolean requiresTwoFactor,
                    String challengeToken, boolean totpEnrollment, String otpauthUri,
                    String totpSecretForDisplay) {
        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.userId = userId;
        this.username = username;
        this.fullName = fullName;
        this.roles = roles;
        this.requiresTwoFactor = requiresTwoFactor;
        this.challengeToken = challengeToken;
        this.totpEnrollment = totpEnrollment;
        this.otpauthUri = otpauthUri;
        this.totpSecretForDisplay = totpSecretForDisplay;
    }
}
