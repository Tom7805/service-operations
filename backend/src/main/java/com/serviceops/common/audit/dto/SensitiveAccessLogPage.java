package com.serviceops.common.audit.dto;

import com.serviceops.common.audit.enums.AccessAction;
import com.serviceops.common.audit.enums.SensitiveDataType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Kết quả tra cứu nhật ký truy cập dữ liệu nhạy cảm (NCL-01-CN-006).
 * Gói danh sách bản ghi kèm thông tin phân trang.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SensitiveAccessLogPage {

    /** Nội dung trang hiện tại. */
    private List<SensitiveAccessLogRes> content;

    /** Số trang hiện tại (bắt đầu 0). */
    private int page;

    /** Số bản ghi mỗi trang. */
    private int size;

    /** Tổng số bản ghi thỏa bộ lọc. */
    private long totalElements;

    /** Tổng số trang. */
    private int totalPages;
}
