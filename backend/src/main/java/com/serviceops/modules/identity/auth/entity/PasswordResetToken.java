package com.serviceops.modules.identity.auth.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Đường dẫn khôi phục mật khẩu gửi qua "thư điện tử mô phỏng" (QTN-04: hệ
 * thống chỉ dùng dữ liệu mô phỏng). Mỗi token dùng được đúng một lần và có
 * hạn dùng — hết hạn hoặc đã dùng thì bị coi là không hợp lệ
 * (NCL-01-CN-008-TC-02).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * SHA-256 (hex, 64 ky tu) cua token, KHONG PHAI token tho.
     *
     * <p>Ban tho chi ton tai trong lien ket gui toi nguoi dung va khong duoc luu
     * lai o dau — ke ca trong log. Luu tho o day thi mot ban sao luu bi ro hay
     * mot lo hong SQL chi-doc cung du de chiem tai khoan nguoi khac. Xem
     * {@code V31__hash_password_reset_tokens.sql}.</p>
     */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public boolean isUsable() {
        return !isExpired() && !isUsed();
    }
}
