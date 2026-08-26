package com.serviceops.modules.customer.dto.response;

/**
 * Ho so khach hang nghi trung khi luu ho so moi (NCL-02-CN-002, TC-01).
 *
 * @param id              ma ho so da co.
 * @param code            ma khach hang cua ho so da co.
 * @param name            ten cong ty cua ho so da co.
 * @param taxCode         ma so thue cua ho so da co.
 * @param phone           so dien thoai cua ho so da co.
 * @param similarity      muc do giong nhau (0.0 - 1.0, 1.0 la trung tuyet doi).
 * @param matchedFields   cac truong khop (ten / maSoThue / soDienThoai).
 */
public record DuplicateCandidateRes(
        Long id,
        String code,
        String name,
        String taxCode,
        String phone,
        double similarity,
        java.util.List<String> matchedFields
) {}
