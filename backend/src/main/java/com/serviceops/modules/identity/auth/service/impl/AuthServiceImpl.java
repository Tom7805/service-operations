package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.audit.AuditAction;
import com.serviceops.common.audit.AuditLogService;
import com.serviceops.common.security.JwtTokenProvider;
import com.serviceops.config.properties.JwtProperties;
import com.serviceops.modules.identity.auth.dto.request.LoginReq;
import com.serviceops.modules.identity.auth.dto.response.CurrentUserRes;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;
import com.serviceops.modules.identity.auth.service.AuthService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String INVALID_CREDENTIALS_MESSAGE = "Tài khoản hoặc mật khẩu không đúng";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public LoginRes login(LoginReq request, String ipAddress) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS_MESSAGE));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            auditLogService.record(null, request.getEmail(), AuditAction.LOGIN_FAILED,
                    "User", user.getId(), "Sai mật khẩu khi đăng nhập");
            throw new BadCredentialsException(INVALID_CREDENTIALS_MESSAGE);
        }

        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getTokenVersion());
        auditLogService.record(user.getId(), user.getFullName(), AuditAction.LOGIN_SUCCESS,
                "User", user.getId(), "Đăng nhập thành công từ IP " + ipAddress);

        return LoginRes.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresInMs(jwtProperties.getExpirationMs())
                .user(new CurrentUserRes(user.getId(), user.getFullName(), user.getEmail()))
                .build();
    }
}
