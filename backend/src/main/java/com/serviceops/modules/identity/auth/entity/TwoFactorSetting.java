package com.serviceops.modules.identity.auth.entity;

import com.serviceops.common.entity.BaseEntity;
import com.serviceops.modules.identity.user.entity.Role;
import com.serviceops.modules.identity.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Cấu hình bật/tắt xác thực hai bước theo {@code role} (NCL-01-CN-009).
 *
 * <p>Story yêu cầu quản trị viên bật 2FA <b>cho từng vai trò</b> xem dữ liệu
 * tài chính (theo mô tả "bật xác thực hai bước cho các vai trò"). Mỗi vai trò
 * có đúng một dòng cấu hình; {@link #enabled} quyết định user thuộc vai trò đó
 * có phải nhập mã một lần khi đăng nhập hay không (TC-01).</p>
 *
 * <p>{@link #updatedBy} + {@link #updatedAt} phục vụ TC-04: ghi lại người thực
 * hiện, nội dung và thời điểm mỗi lần thay đổi cấu hình 2FA.</p>
 */
@Getter
@Setter
@Entity
@Table(name = "two_factor_settings")
public class TwoFactorSetting extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false, unique = true)
    private Role role;

    @Column(nullable = false)
    private boolean enabled;

    /** Người thực hiện lần bật/tắt cuối cùng (TC-04). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
