package com.serviceops.common.audit.dto;

import com.serviceops.common.audit.enums.SensitiveDataType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

/**
 * Bộ lọc tra cứu nhật ký truy cập dữ liệu nhạy cảm (NCL-01-CN-006).
 *
 * <p>Đáp ứng TC-01: lọc theo <b>người dùng</b> (userId/username), <b>loại dữ liệu</b> (dataType)
 * và <b>khoảng thời gian</b> (from..to).</p>
 */
@Getter
@Setter
public class SensitiveAccessLogSearchReq {

    /** Lọc theo mã người dùng thực hiện truy cập. */
    private Long userId;

    /** Lọc theo tên tài khoản (tìm chứa, không phân biệt hoa thường). */
    private String username;

    /** Lọc theo loại dữ liệu nhạy cảm. */
    private SensitiveDataType dataType;

    /** Ngày giờ bắt đầu khoảng lọc (bao gồm). */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime from;

    /** Ngày giờ kết thúc khoảng lọc (bao gồm). */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime to;

    /** Số trang, bắt đầu từ 0. */
    @Min(0)
    private int page = 0;

    /** Số bản ghi mỗi trang. */
    @Min(1)
    @Max(200)
    private int size = 20;
}
