package com.serviceops.modules.customer.enums;

/**
 * Hành động ghi nhat ky khach hang. Dung chung cho NCL-02-CN-002 (chong trung
 * ho so) va NCL-02-CN-003 (quan ly nguoi lien he) tren cung bang
 * {@code customer_audit_logs}.
 */
public enum CustomerAuditAction {
    /** Tao ho so khach hang moi khong co nghi ngo trung. */
    CREATE,

    /** Tao ho so moi khi bo qua canh bao trung, kem ly do (NCL-02-CN-002, TC-02). */
    CREATE_WITH_OVERRIDE,

    /** He thong chan tao moi vi phat hien trung giong cao (NCL-02-CN-002, TC-01). */
    BLOCKED_DUPLICATE,

    /** Xem ho so tong hop cua khach hang (NCL-02-CN-004, TC-03). */
    VIEW_OVERVIEW,

    /** Truy cap bi tu choi vi nguoi dung khong co quyen thuc hien thao tac (TC-04 / NCL-02-CN-003 TC-03). */
    DENIED_ACCESS,

    /** Them nguoi lien he moi cho khach hang (NCL-02-CN-003, TC-01). */
    CONTACT_ADD,

    /** Danh dau mot nguoi lien he la dau moi chinh, chuyen nguoi cu thanh dau moi phu (NCL-02-CN-003, TC-02). */
    CONTACT_SET_PRIMARY,

    /** Cap nhat nganh nghe, quy mo va muc do uu tien khach hang (NCL-02-CN-005). */
    SEGMENT_UPDATE,

    /** Chinh sua thong tin ho so khach hang (ten / MST / SDT / nganh / dia chi). */
    UPDATE,

    /** Chinh sua ho so khach hang khi bo qua canh bao trung, kem ly do. */
    UPDATE_WITH_OVERRIDE,

    /** Gop ho so khach hang trung, ghi tren ho so "giu lai" (NCL-02-CN-006, TC-04). */
    MERGE;

    /**
     * Nhan hanh dong hien thi tren trang Nhat ky he thong tong hop ({@code /audit-logs}).
     */
    public String displayLabel() {
        return switch (this) {
            case CREATE, CREATE_WITH_OVERRIDE -> "Tạo hồ sơ khách hàng";
            case BLOCKED_DUPLICATE -> "Chặn tạo hồ sơ trùng";
            case VIEW_OVERVIEW -> "Xem hồ sơ tổng hợp khách hàng";
            case DENIED_ACCESS -> "Từ chối truy cập khách hàng";
            case CONTACT_ADD -> "Thêm người liên hệ";
            case CONTACT_SET_PRIMARY -> "Đánh dấu đầu mối chính";
            case SEGMENT_UPDATE -> "Cập nhật phân nhóm khách hàng";
            case UPDATE, UPDATE_WITH_OVERRIDE -> "Chỉnh sửa hồ sơ khách hàng";
            case MERGE -> "Gộp hồ sơ khách hàng";
        };
    }
}
