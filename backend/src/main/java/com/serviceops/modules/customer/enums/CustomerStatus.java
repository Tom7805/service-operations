package com.serviceops.modules.customer.enums;

/**
 * Trang thai ho so khach hang.
 */
public enum CustomerStatus {
    ACTIVE,
    INACTIVE,

    /** Ho so da bi gop vao ho so khac (NCL-02-CN-006) - khong con duoc dung cho thao tac nghiep vu moi. */
    MERGED
}
