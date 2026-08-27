package com.serviceops.modules.customer.enums;

/**
 * Vai trò của người liên hệ trong hồ sơ khách hàng (NCL-02-CN-003).
 */
public enum ContactRole {

    /** Đầu mối chính — duy nhất một người cho mỗi khách hàng tại một thời điểm (TC-02). */
    PRIMARY,

    /** Đầu mối phụ. */
    SECONDARY
}
