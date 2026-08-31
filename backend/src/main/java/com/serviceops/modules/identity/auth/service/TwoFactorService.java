package com.serviceops.modules.identity.auth.service;

import com.serviceops.modules.identity.auth.dto.request.TwoFactorConfigReq;
import com.serviceops.modules.identity.auth.dto.request.TwoFactorVerifyReq;
import com.serviceops.modules.identity.auth.dto.response.TwoFactorChallengeRes;
import com.serviceops.modules.identity.auth.dto.response.TwoFactorSetupRes;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.auth.dto.response.LoginRes;

import java.util.List;

/**
 * Xác thực hai bước (2FA) kiểu Google Authenticator/Authy — TOTP theo RFC 6238
 * (NCL-01-CN-009).
 *
 * <p>Quản trị viên bật 2FA cho từng vai trò; người dùng thuộc vai trò đó, ở lần
 * đăng nhập đầu tiên sau khi bật, phải quét mã QR để liên kết app Authenticator
 * (thiết lập một lần); các lần sau chỉ cần mở app đọc mã 6 số hiện tại — không
 * gửi/nhận gì qua mạng, mã tự sinh trên máy người dùng.</p>
 */
public interface TwoFactorService {

    /**
     * TC-01: kiểm tra xem người dùng (theo danh sách vai trò) có thuộc một vai trò
     * đang bật 2FA hay không → quyết định có cần nhập mã một lần khi đăng nhập.
     */
    boolean requiresTwoFactor(List<String> roleCodes);

    /**
     * TC-01: tạo phiên chờ nhập mã TOTP cho người dùng. Nếu tài khoản chưa từng
     * thiết lập app Authenticator (chưa có khóa bí mật) sẽ sinh khóa mới và trả
     * kèm chuỗi để vẽ QR ({@link TwoFactorChallengeRes#enrollment()} = true);
     * nếu đã thiết lập, chỉ trả challenge token để nhập mã bình thường.
     */
    TwoFactorChallengeRes createChallenge(User user);

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
