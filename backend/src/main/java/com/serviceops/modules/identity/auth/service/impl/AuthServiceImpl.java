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
            // NCL-01-CN-001-TC-02: bao ro thoi gian con phai cho.
            throw new BusinessRuleException(ErrorCode.ACCOUNT_LOCKED,
                    "Tài khoản đang tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau "
                            + formatWait(seconds) + ".");
        }

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            loginAttemptService.recordFailure(user, request.getUsername(), ipAddress);
            throw new BusinessRuleException(ErrorCode.INVALID_CREDENTIALS, "Tên tài khoản hoặc mật khẩu không đúng.");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            loginAttemptService.recordRejectedInactive(user, ipAddress);
            throw new BusinessRuleException(ErrorCode.ACCOUNT_INACTIVE,
                    "Tài khoản đã bị quản trị viên khóa. Vui lòng liên hệ quản trị viên.");
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

    /** "45 giây", "5 phút", "4 phút 30 giây". */
    static String formatWait(long seconds) {
        long minutes = seconds / 60;
        long rest = seconds % 60;
        if (minutes == 0) {
            return rest + " giây";
        }
        return rest == 0 ? minutes + " phút" : minutes + " phút " + rest + " giây";
    }
}
