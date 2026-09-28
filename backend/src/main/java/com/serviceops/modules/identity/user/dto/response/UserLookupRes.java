package com.serviceops.modules.identity.user.dto.response;

/**
 * Danh sach rut gon (id, ten) de chon nguoi dung trong cac combobox — vi du chon
 * "Nguoi quan ly du an" khi tao du an tu hop dong. Khac UserRes o cho khong lo
 * username/email/vai tro, nen mo duoc cho nhieu vai tro hon GET /users (chi VT-07).
 */
public record UserLookupRes(
        Long id,
        String fullName
) {}
