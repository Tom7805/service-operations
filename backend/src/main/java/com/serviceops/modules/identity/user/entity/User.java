package com.serviceops.modules.identity.user.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.identity.user.enums.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Tài khoản đăng nhập hệ thống (NCL-01-CN-001/002).
 *
 * <p>Đây là phiên bản tối thiểu phục vụ luồng đăng nhập và đổi/khôi phục mật
 * khẩu (NCL-01-CN-008). Các trường vai trò, phạm vi dữ liệu theo cây tổ chức
 * (QTN-01) và quan hệ với Employee/Department thuộc NCL-01-CN-002 ¬ CN-004,
 * sẽ được người phụ trách các story đó bổ sung — không thêm tùy tiện ở đây để
 * tránh xung đột thiết kế bảng.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    /** Dùng làm định danh đăng nhập và địa chỉ nhận email khôi phục mật khẩu. */
    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    /**
     * Tăng lên 1 mỗi khi mật khẩu bị đổi hoặc khôi phục. JWT phát hành trước đó
     * mang tokenVersion cũ sẽ không còn hợp lệ — đây là cơ chế "chấm dứt các
     * phiên đăng nhập khác" theo tiêu chí chấp nhận NCL-01-CN-008-TC-01.
     */
    @Column(name = "token_version", nullable = false)
    private int tokenVersion = 0;

    public void bumpTokenVersion() {
        this.tokenVersion++;
    }
}
