package com.serviceops.modules.customer.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * Yeu cau gop hai ho so khach hang trung (NCL-02-CN-006).
 *
 * @param targetCustomerId ho so "giu lai" (ho so chinh) - nhan toan bo du lieu lien quan.
 * @param sourceCustomerId ho so "bi gop" (ho so phu) - chuyen sang trang thai da gop sau khi gop xong.
 */
public record CustomerMergeReq(
        @NotNull(message = "Phai chon ho so giu lai")
        Long targetCustomerId,

        @NotNull(message = "Phai chon ho so bi gop")
        Long sourceCustomerId
) {}
