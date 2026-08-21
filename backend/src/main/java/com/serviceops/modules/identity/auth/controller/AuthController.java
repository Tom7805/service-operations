package com.serviceops.modules.identity.auth.controller;

import com.serviceops.common.api.ApiPaths;
import com.serviceops.common.api.BaseRes;
import com.serviceops.common.security.UserPrincipal;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.LoginReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;
import com.serviceops.modules.identity.auth.service.AuthService;
import com.serviceops.modules.identity.auth.service.PasswordService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-01-CN-001 (đăng nhập, bản tối thiểu) và NCL-01-CN-008 (đổi / khôi phục
 * mật khẩu — CV-03 của story này).
 */
@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordService passwordService;

    @PostMapping(ApiPaths.AUTH_LOGIN)
    public BaseRes<LoginRes> login(@Valid @RequestBody LoginReq request, HttpServletRequest httpRequest) {
        LoginRes result = authService.login(request, clientIp(httpRequest));
        return BaseRes.ok(result);
    }

    @PostMapping(ApiPaths.AUTH_CHANGE_PASSWORD)
    public BaseRes<Void> changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                         @Valid @RequestBody ChangePasswordReq request) {
        passwordService.changePassword(principal.getUserId(), request);
        return BaseRes.ok("Đổi mật khẩu thành công, các phiên đăng nhập khác đã được đăng xuất");
    }

    @PostMapping(ApiPaths.AUTH_FORGOT_PASSWORD)
    public BaseRes<Void> forgotPassword(@Valid @RequestBody ForgotPasswordReq request) {
        passwordService.forgotPassword(request);
        return BaseRes.ok("Nếu email tồn tại trong hệ thống, liên kết khôi phục mật khẩu đã được gửi");
    }

    @GetMapping(ApiPaths.AUTH_RESET_PASSWORD_VALIDATE)
    public BaseRes<Boolean> validateResetToken(@RequestParam String token) {
        return BaseRes.ok(passwordService.isResetTokenValid(token));
    }

    @PostMapping(ApiPaths.AUTH_RESET_PASSWORD)
    public BaseRes<Void> resetPassword(@Valid @RequestBody ResetPasswordReq request) {
        passwordService.resetPassword(request);
        return BaseRes.ok("Đặt lại mật khẩu thành công, vui lòng đăng nhập lại");
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
