package com.serviceops.modules.identity.auth.dto.response;

import java.util.List;

/**
 * Thong tin phien hien tai, phuc vu FE lam moi vai tro/pham vi ma khong can dang nhap lai
 * (NCL-01-CN-004 TC-03). Du lieu lay tu principal da duoc JwtAuthFilter nap moi tu DB moi request.
 */
public record CurrentUserRes(
        Long userId,
        String username,
        String fullName,
        List<String> roles,
        String scopeType
) {}
