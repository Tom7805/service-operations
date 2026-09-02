package com.serviceops.modules.identity.auth.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.LoginReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;
import com.serviceops.modules.identity.auth.service.AuthService;
import com.serviceops.modules.identity.auth.service.PasswordService;
import com.serviceops.security.CustomUserDetails;
import com.serviceops.security.PasswordResetRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordService passwordService;
    private final PasswordResetRateLimiter passwordResetRateLimiter;

    @PostMapping("/login")
    public BaseRes<LoginRes> login(@Valid @RequestBody LoginReq request, HttpServletRequest httpRequest) {
        String ipAddress = extractIp(httpRequest);
        LoginRes result = authService.login(request, ipAddress);
        return BaseRes.ok(result);
    }

    /** NCL-01-CN-008-TC-01: nguoi dung dang dang nhap tu doi mat khau. */
    @PostMapping("/change-password")
    public BaseRes<Void> changePassword(@Valid @RequestBody ChangePasswordReq request) {
        passwordService.changePassword(currentUserId(), request);
        return BaseRes.ok(null);
    }

    /**
     * Khoi tao yeu cau khoi phuc mat khau: sinh token, gui lien ket qua email.
     *
     * <p>Co gioi han tan suat theo CA dia chi IP lan dia chi email. Diem cuoi nay
     * cong khai, khong doi dang nhap, va moi lan goi vua tao mot dong trong CSDL
     * vua gui mot la thu that — khong chan thi ke tan cong doi bom duoc hom thu
     * cua nan nhan va lam ten mien gui thu cua cong ty bi danh dau spam.</p>
     */
    @PostMapping("/forgot-password")
    public BaseRes<Void> forgotPassword(@Valid @RequestBody ForgotPasswordReq request,
                                        HttpServletRequest httpRequest) {
        passwordResetRateLimiter.check(extractIp(httpRequest), request.getEmail());
        passwordService.forgotPassword(request);
        return BaseRes.ok(null);
    }

    /**
     * NCL-01-CN-008-TC-02: kiem tra ma khoi phuc con hieu luc.
     *
     * <p>Can CA email lan ma vi may chu tra cuu ma theo nguoi dung. Diem cuoi nay
     * KHONG lam tang so lan nhap sai — no chi de giao dien kiem tra truoc, khong
     * phai mot lan thu that. Nhung no van di qua bo gioi han tan suat, neu khong
     * chinh no se thanh duong do ma khong bi dem.</p>
     */
    @GetMapping("/reset-password/validate")
    public BaseRes<Boolean> validateResetCode(@RequestParam String email,
                                              @RequestParam String code,
                                              HttpServletRequest httpRequest) {
        passwordResetRateLimiter.check(extractIp(httpRequest), email);
        return BaseRes.ok(passwordService.isResetCodeValid(email, code));
    }

    @PostMapping("/reset-password")
    public BaseRes<Void> resetPassword(@Valid @RequestBody ResetPasswordReq request) {
        passwordService.resetPassword(request);
        return BaseRes.ok(null);
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CustomUserDetails principal = (CustomUserDetails) authentication.getPrincipal();
        return principal.getId();
    }

    private String extractIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
