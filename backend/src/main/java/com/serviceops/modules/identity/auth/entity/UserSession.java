package com.serviceops.modules.identity.auth.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Phiên "chờ xác thực" giữa bước 1 (mật khẩu đúng) và bước 2 (nộp mã OTP)
 * của xác thực hai bước (NCL-01-CN-009).
 *
 * <p>Khi user thuộc vai trò đang bật 2FA đăng nhập đúng mật khẩu, hệ thống chưa
 * cấp JWT ngay mà tạo một {@code UserSession} kèm mã một lần. Client gọi
 * endpoint verify với {@link #tokenId} (challenge) và mã OTP để hoàn tất
 * (TC-01).</p>
 *
 * <p>OTP được lưu dạng {@code otpHash} (không lưu dạng rõ), có hạn dùng
 * {@code otpExpiresAt} và bộ đếm {@code otpAttempts} để khóa tạm sau 3 lần sai
 * (TC-02). {@code verifiedAt} đánh dấu mã đã dùng — mỗi mã dùng được đúng một
 * lần.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "user_sessions")
public class UserSession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Mã định danh challenge trả về cho client, dùng để nộp mã OTP. */
    @Column(name = "token_id", nullable = false, unique = true, length = 100)
    private String tokenId;

    /** Hash của mã OTP (SHA-256) — không lưu mã dạng rõ. */
    @Column(name = "otp_hash", length = 64)
    private String otpHash;

    @Column(name = "otp_expires_at")
    private LocalDateTime otpExpiresAt;

    /** Số lần nhập sai mã OTP cho phiên này (TC-02). */
    @Column(name = "otp_attempts", nullable = false)
    private int otpAttempts;

    /** Thời điểm mã OTP được xác thực thành công — mã chỉ dùng một lần. */
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "issued_at", insertable = false, updatable = false)
    private LocalDateTime issuedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    /** True nếu mã đã được dùng để hoàn tất xác thực. */
    public boolean isVerified() {
        return verifiedAt != null;
    }

    /** True nếu mã đã hết hạn dùng. */
    public boolean isOtpExpired() {
        return otpExpiresAt != null && LocalDateTime.now().isAfter(otpExpiresAt);
    }
}
