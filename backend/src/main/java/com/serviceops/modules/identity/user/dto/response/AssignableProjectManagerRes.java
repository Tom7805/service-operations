package com.serviceops.modules.identity.user.dto.response;

/**
 * Tai khoan dang hoat dong (ACTIVE) dung cho combobox "Nguoi quan ly du an"
 * (NCL-05-CN-001/007). Quan ly du an (VT-02) can du lieu nay nhung khong duoc
 * phep goi API quan ly tai khoan day du (/users, chi VT-07).
 */
public record AssignableProjectManagerRes(
        Long id,
        String username,
        String fullName
) {}
