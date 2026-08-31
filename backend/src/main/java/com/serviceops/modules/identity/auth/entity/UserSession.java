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
 * Phiên "chờ xác thực" giữa bước 1 (mật khẩu đúng) và bước 2 (nộp mã TOTP)
 * của xác thực hai bước kiểu Google Authenticator/Authy (NCL-01-CN-009).
 *
 * <p>Khi user thuộc vai trò đang bật 2FA đăng nhập đúng mật khẩu, hệ thống chưa
 * cấp JWT ngay mà tạo một {@code UserSession} làm "vé chờ". Client gọi endpoint
 * verify với {@link #tokenId} (challenge) và mã 6 số hiện tại trên app
 * Authenticator để hoàn tất (TC-01). Mã không lưu ở đâu cả — server tính lại
 * bằng khóa bí mật của user ({@code User.totpSecret}) và giờ hệ thống mỗi lần
 * kiểm.</p>
 *
 * <p>{@code otpAttempts} đếm số lần nhập sai để khóa tạm sau 3 lần (TC-02).
 * {@code verifiedAt} đánh dấu phiên đã dùng — mỗi phiên chỉ xác thực thành công
 * đúng một lần.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "user_sessions")
public class UserSession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Mã định danh challenge trả về cho client, dùng để nộp mã TOTP. */
    @Column(name = "token_id", nullable = false, unique = true, length = 100)
    private String tokenId;

    /** Số lần nhập sai mã cho phiên này (TC-02). */
    @Column(name = "otp_attempts", nullable = false)
    private int otpAttempts;

    /** Thời điểm xác thực thành công — phiên chỉ dùng được đúng một lần. */
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "issued_at", insertable = false, updatable = false)
    private LocalDateTime issuedAt;

    /** Hạn của phiên chờ (không phải hạn của mã — mã TOTP tự đổi mỗi 30 giây). */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    /** True nếu phiên đã được dùng để hoàn tất xác thực. */
    public boolean isVerified() {
        return verifiedAt != null;
    }
}
