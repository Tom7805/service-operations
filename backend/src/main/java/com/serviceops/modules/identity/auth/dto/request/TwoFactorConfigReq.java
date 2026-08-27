package com.serviceops.modules.identity.auth.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Yêu cầu bật/tắt xác thực hai bước cho một vai trò (NCL-01-CN-009).
 *
 * <p>Chỉ quản trị viên ({@code VT-07}) được gọi (TC-03).</p>
 */
@Getter
@Setter
public class TwoFactorConfigReq {

    @NotNull(message = "Vui lòng chọn trạng thái bật/tắt")
    private Boolean enabled;
}

