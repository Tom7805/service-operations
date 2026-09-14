package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorVerifyReq;
import com.serviceops.modules.identity.auth.entity.UserSession;
import com.serviceops.modules.identity.auth.repository.TwoFactorSettingRepository;
import com.serviceops.modules.identity.auth.repository.UserSessionRepository;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.security.JwtProvider;
import com.serviceops.security.LoginAttemptService;
import com.serviceops.security.TotpUtil;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Toan bo logic xac thuc ma 2FA, chay trong DUY NHAT MOT giao dich, TRA VE
 * ket qua thay vi nem loi.
 *
 * <p><b>Vi sao tach rieng thanh mot bean o day, thay vi de nguyen trong
 * {@code TwoFactorServiceImpl.verifyTwoFactor} nhu truoc.</b> Day la lan sua
 * THU HAI cho cung mot loi ban dau (dem so lan sai bi mat do giao dich cuon
 * nguoc khi nem RuntimeException). Lan sua DAU TIEN tach rieng mot bean
 * {@code TwoFactorAttemptRecorder} chay {@code @Transactional(REQUIRES_NEW)}
 * — dung y het khuon mau da dung thanh cong cho luong khoi phuc mat khau
 * ({@code PasswordResetAttemptRecorder}). Nhung o day khuon mau do lam
 * TREO CA BACKEND toi 20+ giay, khong tra loi:</p>
 *
 * <p>{@code UserSessionRepository.findByTokenId} mang {@code @Lock(PESSIMISTIC_WRITE)}
 * — them co chu dich tu commit "prevent two-factor challenge replay", de
 * chan hai request verify cung challengeToken chay dong thoi. Giao dich CHA
 * (phuong thuc verify) giu khoa bi quan tren DUNG DONG session do TU DAU DEN
 * CUOI phuong thuc. Khi no goi mot giao dich REQUIRES_NEW rieng de ghi
 * {@code otpAttempts} len CHINH dong do, giao dich con phai CHO giao dich cha
 * nha khoa — nhung giao dich cha lai dang goi DONG BO va CHO giao dich con
 * hoan tat truoc khi no tu ket thuc. Hai giao dich tu khoa cheo nhau; InnoDB
 * chi coi day la "cho lock" tu phia giao dich con (giao dich cha khong dang
 * cho lock nao ca duoi mat DB, no dang chay code Java binh thuong) nen KHONG
 * phat hien duoc day la deadlock co dien — no cho toi het
 * {@code innodb_lock_wait_timeout} (mac dinh 50 giay) roi moi bao loi. Day
 * chinh la ly do request "treo" thay vi bao loi ngay.</p>
 *
 * <p><b>Cach sua dung, khong pha vo hang rao chong replay:</b> khong the dung
 * mot giao dich RIENG de sua DUNG dong ma giao dich cha dang khoa — bat ke
 * REQUIRES_NEW hay bat ky muc do co lap nao, giao dich thu hai VAN PHAI CHO
 * giao dich thu nhat nha khoa truoc. Giai phap la GOM TOAN BO logic (doc, so
 * sanh OTP, tang dem neu sai, luu, khoa tai khoan neu dat nguong) vao MOT
 * giao dich duy nhat — dung nhu giao dich cha da lam — nhung KHONG NEM LOI
 * RUNTIME o day nua. Thay vao do TRA VE {@link TwoFactorVerifyOutcome}.
 * {@code TwoFactorServiceImpl.verifyTwoFactor} (khong con {@code @Transactional})
 * goi phuong thuc nay, roi CAN CU KET QUA de nem loi — luc do giao dich da
 * COMMIT XONG ROI, nen viec nem loi sau khong con gi de "cuon nguoc" nua.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TwoFactorVerificationTransaction {

    private final UserSessionRepository userSessionRepository;
    private final UserRepository userRepository;
    private final UserRoleScopeRepository userRoleScopeRepository;
    private final LoginAttemptService loginAttemptService;
    private final JwtProvider jwtProvider;
    private final TwoFactorSettingRepository twoFactorSettingRepository;

    private static final int TOTP_DRIFT_STEPS = 1;

    @Transactional
    public TwoFactorVerifyOutcome execute(TwoFactorVerifyReq request, int maxOtpAttempts, long lockSeconds) {
        UserSession session = userSessionRepository.findByTokenId(request.getChallengeToken()).orElse(null);
        if (session == null) {
            return TwoFactorVerifyOutcome.loi(ErrorCode.TWO_FACTOR_INVALID,
                    "Ma xac thuc khong hop le, vui long dang nhap lai");
        }

        if (session.isVerified() || session.getRevokedAt() != null) {
            return TwoFactorVerifyOutcome.loi(ErrorCode.TWO_FACTOR_INVALID,
                    "Ma xac thuc da duoc su dung, vui long dang nhap lai");
        }

        if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
            return TwoFactorVerifyOutcome.loi(ErrorCode.TWO_FACTOR_INVALID,
                    "Phien xac thuc da het han, vui long dang nhap lai");
        }

        User user = userRepository.findById(session.getUser().getId()).orElse(null);
        if (user == null) {
            return TwoFactorVerifyOutcome.loi(ErrorCode.TWO_FACTOR_INVALID,
                    "Tai khoan khong con ton tai, vui long dang nhap lai");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            return TwoFactorVerifyOutcome.loi(ErrorCode.ACCOUNT_INACTIVE, "Tai khoan khong con duoc phep dang nhap");
        }
        if (loginAttemptService.isLocked(user)) {
            return TwoFactorVerifyOutcome.loi(ErrorCode.ACCOUNT_LOCKED, "Tai khoan dang tam khoa, vui long thu lai sau");
        }

        List<String> currentRoles = userRoleScopeRepository.findRoleCodesByUserId(user.getId());
        // Lap lai logic cua TwoFactorServiceImpl.requiresTwoFactor ngay tai day
        // (khong goi qua interface TwoFactorService) de tranh phu thuoc vong:
        // TwoFactorServiceImpl -> bean nay -> TwoFactorService -> chinh no.
        List<String> enabledRoleCodes = twoFactorSettingRepository.findByEnabledTrue().stream()
                .map(setting -> setting.getRole().getCode())
                .toList();
        boolean stillRequires = currentRoles != null && currentRoles.stream().anyMatch(enabledRoleCodes::contains);
        if (!stillRequires) {
            return TwoFactorVerifyOutcome.loi(ErrorCode.TWO_FACTOR_INVALID,
                    "Chinh sach xac thuc hai buoc da thay doi, vui long dang nhap lai");
        }

        if (user.getTotpSecret() == null || !TotpUtil.verifyCode(user.getTotpSecret(), request.getOtp(), TOTP_DRIFT_STEPS)) {
            // Dem VA LUU trong CUNG giao dich nay — giao dich nay khong nem loi
            // nen no se COMMIT binh thuong, khong bi cuon nguoc.
            session.setOtpAttempts(session.getOtpAttempts() + 1);
            userSessionRepository.save(session);

            if (session.getOtpAttempts() >= maxOtpAttempts) {
                // lockForTwoFactor thao tac tren bang `users`, KHONG PHAI
                // `user_sessions` — khong tranh chap khoa voi giao dich nay
                // nen REQUIRES_NEW o day an toan, khong lap lai deadlock.
                loginAttemptService.lockForTwoFactor(user, lockSeconds);
                log.warn("TWO_FACTOR_MAX_ATTEMPTS userId={} username={} - tam khoa dang nhap. Canh bao quan tri vien (TC-02).",
                        user.getId(), user.getUsername());
                return TwoFactorVerifyOutcome.loi(ErrorCode.ACCOUNT_LOCKED,
                        "Nhap sai ma xac thuc qua so lan cho phep. Tai khoan tam khoa, vui long thu lai sau.");
            }

            return TwoFactorVerifyOutcome.loi(ErrorCode.TWO_FACTOR_INVALID, "Ma xac thuc khong dung");
        }

        session.setVerifiedAt(LocalDateTime.now());
        session.setRevokedAt(LocalDateTime.now());
        userSessionRepository.save(session);

        if (user.getTotpConfirmedAt() == null) {
            user.setTotpConfirmedAt(LocalDateTime.now());
            userRepository.save(user);
            log.info("TWO_FACTOR_ENROLLED userId={} username={} - da lien ket app Authenticator", user.getId(), user.getUsername());
        }

        log.info("TWO_FACTOR_VERIFIED userId={} username={}", user.getId(), user.getUsername());

        String token = jwtProvider.generateToken(user.getId(), user.getUsername(), currentRoles, user.getTokenVersion());
        return TwoFactorVerifyOutcome.thanhCong(
                new com.serviceops.modules.identity.auth.dto.response.LoginRes(
                        token, "Bearer", user.getId(), user.getUsername(), user.getFullName(), currentRoles));
    }
}
