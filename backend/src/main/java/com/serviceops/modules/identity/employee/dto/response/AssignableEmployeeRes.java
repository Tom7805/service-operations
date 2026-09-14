package com.serviceops.modules.identity.employee.dto.response;

/**
 * Nhan su du dieu kien duoc giao viec (NCL-05-CN-003) — dung cho combobox
 * "Phan cong" trong cay cong viec (WBS). Quan ly du an (VT-02) can du lieu
 * nay nhung khong duoc phep goi API quan ly ho so nhan su day du (/employees,
 * chi VT-06/VT-07).
 */
public record AssignableEmployeeRes(
        Long userId,
        String username,
        String fullName,
        String professionalRole
) {}
