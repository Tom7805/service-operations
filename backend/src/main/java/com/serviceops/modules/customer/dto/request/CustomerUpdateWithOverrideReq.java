package com.serviceops.modules.customer.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * Xac nhan chinh sua ho so khach hang bo qua canh bao trung, bat buoc kem ly do.
 *
 * @param customer thong tin ho so khach hang sau khi sua.
 * @param override ly do bat buoc khi bo qua canh bao trung.
 */
public record CustomerUpdateWithOverrideReq(
        @Valid @NotNull CustomerUpdateReq customer,
        @Valid @NotNull DuplicateOverrideReq override
) {}
