package com.serviceops.common.audit.enums;

/**
 * Hành động truy cập dữ liệu nhạy cảm được ghi nhật ký.
 */
public enum AccessAction {
    /** Xem dữ liệu nhạy cảm trên màn hình / chi tiết. */
    VIEW,

    /** Xuất (export) dữ liệu nhạy cảm. */
    EXPORT,

    /** Truy cập bị từ chối do không đủ quyền (QTN-01 / QTN-03). */
    DENIED
}
