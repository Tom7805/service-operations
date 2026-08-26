package com.serviceops.modules.customer.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Xac nhan tao moi ho so khach hang bo qua canh bao trung (NCL-02-CN-002, TC-02).
 *
 * @param reason ly do bat buoc phai nhap khi bo qua canh bao trung ho so.
 */
public record DuplicateOverrideReq(
        @NotBlank(message = "Phai ghi ly do khi bo qua canh bao trung ho so")
        @Size(max = 1000, message = "Ly do khong qua 1000 ky tu")
        String reason
) {}
