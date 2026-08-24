package com.serviceops.common.audit.enums;

/**
 * Loại dữ liệu nhạy cảm được ghi nhật ký truy cập (QTN-03).
 * Mọi lần xem/xuất các loại dữ liệu này đều phải ghi nhật ký.
 */
public enum SensitiveDataType {
    /** Lương, thu nhập của nhân viên. */
    SALARY,

    /** Chi phí vận hành. */
    COST,

    /** Giá vốn hàng bán. */
    COST_OF_GOODS,

    /** Biên lợi nhuận. */
    MARGIN
}
