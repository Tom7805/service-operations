package com.serviceops.modules.customer.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * Xac nhan tao moi ho so khach hang bo qua canh bao trung (NCL-02-CN-002, TC-02).
 *
 * @param customer thong tin ho so khach hang moi.
 * @param override ly do bat buoc khi bo qua canh bao trung.
 */
public record CustomerCreateWithOverrideReq(
        @Valid @NotNull CustomerCreateReq customer,
        @Valid @NotNull DuplicateOverrideReq override
) {}