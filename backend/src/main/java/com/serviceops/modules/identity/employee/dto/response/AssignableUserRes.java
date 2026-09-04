package com.serviceops.modules.identity.employee.dto.response;

/**
 * Tai khoan nguoi dung dung cho combobox trong form tao ho so nhan su (NCL-01-CN-007).
 *
 * <p>Tra ve TOAN BO tai khoan trong he thong (khong loc), moi tai khoan kem co {@code hasEmployeeProfile}
 * de Frontend vo hieu hoa nhung tai khoan da co ho so. Nhan su (VT-06) can du lieu nay nhung khong duoc
 * phep goi API quan ly tai khoan (/users, chi VT-07).</p>
 */
public record AssignableUserRes(
        Long id,
        String username,
        String fullName,
        boolean hasEmployeeProfile
) {}
