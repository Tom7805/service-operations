package com.serviceops.modules.contract.enums;

/**
 * Hanh dong ghi nhat ky hop dong (NCL-04, TC-04).
 */
public enum ContractAuditAction {

/** Tao hop dong tu co hoi da thang (NCL-04-CN-001). */
CONTRACT_CREATE,

/** Khai bao/sua loai hop dong, gia tri va han muc tran (NCL-04-CN-002, TC-04). */
TYPE_LIMIT_UPDATE,

/** Khai bao lai danh sach moc thanh toan cua hop dong (NCL-04-CN-003). */
MILESTONE_UPDATE,

/** Doi trang thai mot moc thanh toan (NCL-04-CN-003), vi du danh dau da xuat hoa don. */
MILESTONE_STATUS_UPDATE,

/** Kich hoat hop dong tu DRAFT sang ACTIVE (NCL-04-CN-002). */
CONTRACT_ACTIVATE,

/** Lap phu luc dieu chinh gia tri/noi dung hop dong (NCL-04-CN-004). */
APPENDIX_CREATE,

/** Gia han hop dong, cap nhat ngay ket thuc va gia tri bo sung (NCL-04-CN-007). */
RENEWAL_CREATE,

/** Truy cap chuc nang hop dong bi tu choi vi khong co quyen (NCL-04-CN-002, TC-03). */
DENIED_ACCESS
}
