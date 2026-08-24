package com.serviceops.security.scope;

/**
 * Pham vi du lieu theo QTN-01. Luu duoi dang chuoi trong cot user_role_scopes.scope_type
 * (khong dung MySQL ENUM) nhung xu ly logic o tang ung dung bang enum nay.
 */
public enum DataScopeType {
    /** Toan cong ty - khong bi gioi han theo bo phan. */
    COMPANY,
    /** Mot nhanh to chuc - gioi han theo bo phan va toan bo bo phan con chau. */
    DEPARTMENT,
    /** Chi du lieu ca nhan cua chinh tai khoan do. */
    SELF;

    public static DataScopeType fromCode(String code) {
        if (code == null || code.isBlank()) {
            return COMPANY;
        }
        try {
            return DataScopeType.valueOf(code.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
