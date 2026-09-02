package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.identity.auth.dto.request.ChangePasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ForgotPasswordReq;
import com.serviceops.modules.identity.auth.dto.request.ResetPasswordReq;
import com.serviceops.modules.identity.auth.entity.PasswordResetToken;
import com.serviceops.modules.identity.auth.repository.PasswordResetTokenRepository;
import com.serviceops.modules.identity.auth.service.PasswordResetNotifier;
import com.serviceops.modules.identity.auth.service.PasswordService;
import com.serviceops.modules.identity.auth.validator.PasswordPolicyValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * NCL-01-CN-008 — đổi mật khẩu (đang đăng nhập) và khôi phục mật khẩu (quên
 * mật khẩu → liên kết mô phỏng qua log → đặt lại).
 *
 * <p>TC-01 "chấm dứt các phiên đăng nhập khác" được hiện thực bằng cách tăng
 * {@link User#bumpTokenVersion()}: mọi JWT phát hành trước đó mang tokenVersion
 * cũ nên bị {@link com.serviceops.security.JwtAuthFilter} từ chối ngay từ lần
 * gọi kế tiếp — kể cả token của chính request đang đổi mật khẩu, nên client
 * cần điều hướng người dùng về màn hình đăng nhập sau khi đổi/khôi phục thành
 * công (xem docs/04-api/api-contract.md).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordServiceImpl implements PasswordService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final PasswordResetNotifier passwordResetNotifier;
    private final PasswordResetAttemptRecorder attemptRecorder;

    @Value("${app.password-reset.token-ttl-minutes:30}")
    private long resetTokenTtlMinutes;

    @Override
    @Transactional
    public void changePassword(Long currentUserId, ChangePasswordReq request) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay nguoi dung"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(ErrorCode.INVALID_CREDENTIALS, "Mat khau hien tai khong dung");
        }

        passwordPolicyValidator.validate(request.getNewPassword());

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Mat khau moi phai khac mat khau hien tai");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.bumpTokenVersion();
        userRepository.save(user);

        log.info("PASSWORD_CHANGED userId={} username={}", user.getId(), user.getUsername());
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordReq request) {
        userRepository.findByEmailIgnoreCase(request.getEmail()).ifPresentOrElse(user -> {
            String rawToken = generateResetCode();

            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            // Chi luu BAN BAM. Ma tho khong duoc luu o dau ngoai la thu gui cho
            // dung nguoi dung do — xem V31__hash_password_reset_tokens.sql.
            //
            // Bam CA userId cung ma: mot ma "483920" chi co nghia voi dung nguoi
            // dung do. Neu chi bam rieng ma thi voi khong gian 1.000.000, hai
            // nguoi dung khac nhau hoan toan co the nhan trung ma va ban bam se
            // dung nhau — luc do ma cua nguoi nay mo duoc tai khoan nguoi kia.
            resetToken.setTokenHash(hashResetCode(user.getId(), rawToken));
            resetToken.setExpiresAt(LocalDateTime.now().plusMinutes(resetTokenTtlMinutes));
            passwordResetTokenRepository.save(resetToken);

            // Chuyen lien ket qua kenh cua moi truong dang chay: moi truong phat
            // trien in ra log rieng, moi truong that gui thu qua SMTP.
            // TUYET DOI KHONG ghi token vao log o day. Truoc day dong nay la
            //   log.info("[MOCK EMAIL] ... token={}", ..., rawToken, ...)
            // va no dong nghia voi: ai doc duoc log la doi duoc mat khau bat ky ai.
            //
            // Bat MOI ngoai le tu kenh gui. Day la rao chan cuoi cho tinh chat
            // chong do email, va no phai nam O DAY chu khong chi trong ban gui thu:
            // tinh chat "khong lo ra tai khoan nao co that" la loi hua cua TANG NAY,
            // nen no phai dung du ai cam ban cai dat nao vao.
            //
            // Neu de ngoai le thoat ra thi:
            //     email khong ton tai   -> khong gui gi -> 200
            //     email co that, gui hong -> nem loi    -> 500
            // Ke tan cong chi can nhin ma trang thai la do ra duoc tai khoan nao
            // co that, du khong doc duoc noi dung phan hoi.
            //
            // Ban dau toi chi bat MailException ben trong MailPasswordResetNotifier
            // va tuong the la du. Khong du: timeout, loi phan giai ten mien, hay
            // mot NullPointerException trong chinh kenh gui deu khong phai
            // MailException va van thoat ra. Mot test cho dung tinh huong do da
            // phat hien ra cho nay.
            try {
                passwordResetNotifier.sendResetLink(user, rawToken, resetTokenTtlMinutes);
            } catch (RuntimeException ex) {
                // Khong kem token vao thong bao loi — log loi cung la log.
                log.error("FORGOT_PASSWORD_NOTIFY_FAILED userId={} nguyenNhan={}",
                        user.getId(), ex.getMessage());
            }

            log.info("FORGOT_PASSWORD_REQUESTED userId={} username={}", user.getId(), user.getUsername());
        }, () -> log.info("FORGOT_PASSWORD_REQUESTED email khong ton tai - bo qua de tranh lo thong tin tai khoan"));
        // Co y khong phan biet "email khong ton tai" voi "da gui lien ket" ra ngoai API
        // de tranh ke tan cong do danh sach tai khoan hop le.
        //
        // Va cung khong ghi chinh dia chi email vao log o nhanh "khong ton tai":
        // nhanh do nhan MOI chuoi ai do go vao o nhap, nen no bien log thanh mot
        // bai chua dia chi email tuy y — vua la rui ro du lieu ca nhan, vua cho phep
        // ke tan cong bom du lieu vao log cua he thong.
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isResetCodeValid(String email, String code) {
        return userRepository.findByEmailIgnoreCase(email)
                .flatMap(u -> passwordResetTokenRepository
                        .findFirstByUserIdAndUsedAtIsNullOrderByIdDesc(u.getId())
                        .filter(PasswordResetToken::isUsable)
                        .filter(t -> constantTimeEquals(t.getTokenHash(), hashResetCode(u.getId(), code))))
                .isPresent();
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordReq request) {
        // MOT thong diep loi duy nhat cho MOI truong hop that bai duoi day:
        // email khong ton tai, chua xin ma, ma het han, ma da dung, nhap sai qua
        // so lan, hay ma khong khop. Neu tach thong diep ra thi chinh phan hoi loi
        // se tro thanh cong cu do: "email nay khong ton tai" vs "ma sai" la du de
        // dung danh sach tai khoan hop le.
        BusinessRuleException loiChung = new BusinessRuleException(ErrorCode.RESET_TOKEN_INVALID,
                "Ma khoi phuc khong dung hoac da het han, vui long gui yeu cau moi");

        User user = userRepository.findByEmailIgnoreCase(request.getEmail()).orElseThrow(() -> loiChung);

        // Tra cuu theo NGUOI DUNG, khong theo ma. Xem PasswordResetTokenRepository
        // de biet vi sao — tom tat: tranh trung cheo giua cac nguoi dung, va de co
        // ban ghi ma dem so lan nhap sai.
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findFirstByUserIdAndUsedAtIsNullOrderByIdDesc(user.getId())
                .orElseThrow(() -> loiChung);

        if (!resetToken.isUsable()) {
            throw loiChung;
        }

        if (!constantTimeEquals(resetToken.getTokenHash(), hashResetCode(user.getId(), request.getCode()))) {
            // DEM SO LAN SAI trong mot GIAO DICH RIENG.
            //
            // Phai tach ra vi ngay sau day ta NEM LOI, ma nem loi runtime lam
            // Spring cuon nguoc giao dich hien tai — keo theo xoa luon con so vua
            // dem. Ban dau dem thang o day va bo dem luon quay ve 0, tuc rao chan
            // chong do khong ton tai. Unit test khong bat duoc vi mock giu gia tri
            // trong bo nho, khong co giao dich nao de cuon nguoc; chi chay that
            // moi lo ra.
            attemptRecorder.ghiNhanLanSai(resetToken.getId(), user.getId());
            throw loiChung;
        }

        passwordPolicyValidator.validate(request.getNewPassword());

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.bumpTokenVersion();
        userRepository.save(user);

        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        log.info("PASSWORD_RESET userId={} username={}", user.getId(), user.getUsername());
    }

    /**
     * Sinh ma khoi phuc 6 chu so, tu {@link SecureRandom}.
     *
     * <p>Dung {@code nextInt(1_000_000)} chu khong phai {@code nextInt() % 1_000_000}:
     * phep chia du tren mot so ngau nhien khong chia het se lam vai gia tri dau
     * xuat hien nhieu hon cac gia tri khac (modulo bias), tuc ma khong con deu.</p>
     *
     * <p>Dinh dang {@code %06d} de giu du 6 chu so — thieu no thi ma 42 se hien
     * ra la "42" thay vi "000042", va nguoi dung khong biet phai go bao nhieu so.</p>
     */
    private String generateResetCode() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    /** Bam ma GAN VOI nguoi dung, de mot ma chi co nghia voi dung tai khoan do. */
    private String hashResetCode(Long userId, String code) {
        return hashToken(userId + ":" + code);
    }

    /**
     * So sanh khong phu thuoc noi dung, tranh ro thong tin qua THOI GIAN chay.
     *
     * <p>{@link String#equals} dung ngay khi gap ky tu dau tien khac nhau, nen
     * thoi gian chay cua no tiet lo "doan cua ban dung duoc bao nhieu ky tu dau".
     * Voi mot ma ngan nhu the nay, do la thu ke tan cong co the do duoc va dung
     * de do dan tung ky tu thay vi do ca ma.</p>
     */
    private boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Bam token bang SHA-256, tra ve chuoi hex 64 ky tu.
     *
     * <p>Vi sao khong dung bcrypt/argon2 nhu voi mat khau: hai bai toan khac
     * nhau. Mat khau do NGUOI DUNG chon nen co the doan hoac do tu dien, vi vay
     * can mot ham bam CO Y LAM CHAM. Token nay la 32 byte ngau nhien tu
     * {@link SecureRandom} — khong gian 2^256, khong the do. Ham bam cham chi
     * lam tang chi phi may chu ma khong them chut an toan nao.</p>
     *
     * <p>Cung vi cung ly do do ma khong can "muoi" (salt): muoi de chong bang
     * tra cuu dung san cho cac gia tri hay gap, con day moi token la duy nhat va
     * ngau nhien.</p>
     */
    private String hashToken(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16));
                hex.append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException ex) {
            // SHA-256 la thuat toan BAT BUOC co trong moi ban Java, nen nhanh nay
            // khong bao gio chay. Neu chay that thi he thong dang hong nang.
            throw new IllegalStateException("Moi truong Java thieu SHA-256", ex);
        }
    }
}
