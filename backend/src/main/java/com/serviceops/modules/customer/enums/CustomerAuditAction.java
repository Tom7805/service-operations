package com.serviceops.modules.customer.enums;

/**
 * Hành động ghi nhat ky khach hang (NCL-02-CN-002, TC-05).
 */
public enum CustomerAuditAction {
    /** Tao ho so khach hang moi khong co nghi ngo trung. */
    CREATE,

    /** Tao ho so moi khi bo qua canh bao trung, kem ly do (TC-02). */
    CREATE_WITH_OVERRIDE,

    /** He thong chan tao moi vi phat hien trung giong cao (TC-01). */
    BLOCKED_DUPLICATE,

    /** Truy cap bi tu choi vi nguoi dung khong phai sales (VT-04) hoac PM (VT-02) (TC-04). */
    DENIED_ACCESS,

    /** Gop ho so khach hang trung, ghi tren ho so "giu lai" (NCL-02-CN-006, TC-04). */
    MERGE
}