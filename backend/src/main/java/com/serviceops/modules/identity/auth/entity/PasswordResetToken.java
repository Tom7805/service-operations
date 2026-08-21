package com.serviceops.modules.identity.auth.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
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

    @Column(name = "token", nullable = false, unique = true, length = 100)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public boolean isUsable() {
        return !isExpired() && !isUsed();
    }
}
