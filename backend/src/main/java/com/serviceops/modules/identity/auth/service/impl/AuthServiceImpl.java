package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.LoginReq;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;
import com.serviceops.modules.identity.auth.dto.response.TwoFactorChallengeRes;
import com.serviceops.modules.identity.auth.service.AuthService;
import com.serviceops.modules.identity.auth.service.TwoFactorService;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.security.JwtProvider;
import com.serviceops.security.LoginAttemptService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final LoginAttemptService loginAttemptService;
    private final TwoFactorService twoFactorService;

    @Override
    @Transactional
    public LoginRes login(LoginReq request, String ipAddress) {
        User user = userRepository.findByUsername(request.getUsername()).orElse(null);

        if (user != null && loginAttemptService.isLocked(user)) {
            long seconds = loginAttemptService.remainingLockSeconds(user);
            loginAttemptService.recordRejectedWhileLocked(user, ipAddress);
            throw new BusinessRuleException(ErrorCode.ACCOUNT_LOCKED,
                    "Tai khoan tam khoa do nhap sai mat khau nhieu lan. Vui long thu lai sau " + seconds + " giay.");
        }

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            loginAttemptService.recordFailure(user, request.getUsername(), ipAddress);
            throw new BusinessRuleException(ErrorCode.INVALID_CREDENTIALS, "Ten tai khoan hoac mat khau khong dung");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessRuleException(ErrorCode.ACCOUNT_INACTIVE, "Tai khoan da bi khoa boi quan tri vien");
        }

        loginAttemptService.recordSuccess(user, ipAddress);

        List<String> roles = userRoleScopeRepository.findRoleCodesByUserId(user.getId());
        if (twoFactorService.requiresTwoFactor(roles)) {
            TwoFactorChallengeRes challenge = twoFactorService.createChallenge(user);
            return new LoginRes(null, null, user.getId(), user.getUsername(), user.getFullName(),
                roles, true, challenge.challengeToken(), challenge.enrollment(), challenge.otpauthUri(),
                challenge.secretForDisplay());
        }

        String token = jwtProvider.generateToken(user.getId(), user.getUsername(), roles, user.getTokenVersion());

        return new LoginRes(token, "Bearer", user.getId(), user.getUsername(), user.getFullName(), roles);
    }
}
