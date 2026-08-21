package com.serviceops.common.audit.service;

import com.serviceops.common.audit.dto.SensitiveAccessLogPage;
import com.serviceops.common.audit.dto.SensitiveAccessLogSearchReq;

/**
 * Tra cứu nhật ký truy cập dữ liệu nhạy cảm (NCL-01-CN-006).
 */
public interface SensitiveAccessLogService {

    /**
     * Tra cứu nhật ký theo bộ lọc (người dùng, loại dữ liệu, khoảng thời gian) với phân trang.
     *
     * @param req bộ lọc tra cứu (có thể rỗng = lấy tất cả)
     * @return trang kết quả; rỗng nếu không có bản ghi thỏa điều kiện (TC-02)
     */
    SensitiveAccessLogPage search(SensitiveAccessLogSearchReq req);
}
