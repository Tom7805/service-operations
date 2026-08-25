package com.serviceops.modules.identity.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Trạng thái xác thực hai bước của một vai trò — dùng cho màn hình cấu hình
 * của quản trị viên (NCL-01-CN-009).
 *
 * <p>Mỗi vai trò xem dữ liệu tài chính có một bản ghi cho biết 2FA đang bật
 * hay tắt (TC-01), kèm thông tin ai/bao giờ thay đổi lần cuối (TC-04).</p>
 */
@Getter
@AllArgsConstructor
public class TwoFactorSetupRes {

    private final Long roleId;
    private final String roleCode;
    private final String roleName;
    private final boolean enabled;
    private final String updatedBy;
    private final java.time.LocalDateTime updatedAt;
}
