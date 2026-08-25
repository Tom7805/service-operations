package com.serviceops.modules.identity.auth.service;

import com.serviceops.modules.identity.auth.dto.request.TwoFactorConfigReq;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorVerifyReq;
import com.serviceops.modules.identity.auth.dto.response.TwoFactorSetupRes;
import com.serviceops.modules.identity.auth.entity.UserSession;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;

import java.util.List;

/**
 * Xác thực hai bước (2FA) cho tài khoản xem dữ liệu tài chính (NCL-01-CN-009).
 *
 * <p>Quản trị viên bật 2FA cho từng vai trò; người dùng thuộc vai trò đó phải
 * nhập mã một lần (OTP) trước khi hệ thống cấp JWT.</p>
 */
public interface TwoFactorService {

    /**
     * TC-01: kiểm tra xem người dùng (theo danh sách vai trò) có thuộc một vai trò
     * đang bật 2FA hay không → quyết định có cần nhập mã một lần khi đăng nhập.
     */
    boolean requiresTwoFactor(List<String> roleCodes);

    /**
     * TC-01: tạo phiên chờ OTP cho người dùng, sinh mã một lần (lưu hash, gửi
     * qua kênh mô phỏng) và trả về {@link UserSession#getTokenId()} làm challenge.
     */
    String createChallenge(User user);

    /**
     * TC-01: xác thực mã OTP. Đúng → cấp JWT và trả về {@link LoginRes};
     * sai → tăng bộ đếm, sau 3 lần sai sẽ khóa tạm đăng nhập (TC-02).
     */
    LoginRes verifyTwoFactor(TwoFactorVerifyReq request);

    /** Danh sách trạng thái 2FA của tất cả vai trò — dùng cho màn hình cấu hình. */
    List<TwoFactorSetupRes> listConfigs();

    /**
     * TC-03/TC-04: bật/tắt 2FA cho một vai trò (chỉ quản trị viên). Ghi lại
     * người thực hiện (updatedBy) và thời điểm (updatedAt) cho TC-04.
     */
    TwoFactorSetupRes updateConfig(Long roleId, TwoFactorConfigReq request, Long updatedByUserId);
}
