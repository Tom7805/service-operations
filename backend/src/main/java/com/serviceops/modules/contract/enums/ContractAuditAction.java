package com.serviceops.modules.contract.enums;

/**
 * Hanh dong ghi nhat ky hop dong (NCL-04, TC-04).
 */
public enum ContractAuditAction {

/** Tao hop dong tu co hoi da thang (NCL-04-CN-001). */
CONTRACT_CREATE,

/** Khai bao/sua loai hop dong, gia tri va han muc tran (NCL-04-CN-002, TC-04). */
TYPE_LIMIT_UPDATE,

/** Truy cap chuc nang hop dong bi tu choi vi khong co quyen (NCL-04-CN-002, TC-03). */
DENIED_ACCESS
}