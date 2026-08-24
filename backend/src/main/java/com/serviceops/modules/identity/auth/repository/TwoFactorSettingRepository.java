package com.serviceops.modules.identity.auth.repository;

import com.serviceops.modules.identity.auth.entity.TwoFactorSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Lưu trữ cấu hình bật/tắt xác thực hai bước theo vai trò (NCL-01-CN-009).
 */
public interface TwoFactorSettingRepository extends JpaRepository<TwoFactorSetting, Long> {

    Optional<TwoFactorSetting> findByRole_Id(Long roleId);

    /** Danh sách các vai trò đang bật 2FA — dùng khi đăng nhập để quyết định có cần OTP không. */
    List<TwoFactorSetting> findByEnabledTrue();
}
