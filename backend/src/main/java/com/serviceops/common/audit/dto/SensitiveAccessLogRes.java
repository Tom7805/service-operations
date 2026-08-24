package com.serviceops.common.audit.dto;

import com.serviceops.common.audit.enums.AccessAction;
import com.serviceops.common.audit.enums.SensitiveDataType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Một bản ghi nhật ký truy cập dữ liệu nhạy cảm trả về cho quản trị viên.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SensitiveAccessLogRes {

    /** Mã bản ghi nhật ký. */
    private Long id;

    /** Mã người dùng thực hiện truy cập. */
    private Long userId;

    /** Tên tài khoản người thực hiện. */
    private String username;

    /** Hành động truy cập (xem / xuất / bị từ chối). */
    private AccessAction action;

    /** Loại dữ liệu nhạy cảm bị truy cập. */
    private SensitiveDataType dataType;

    /** Mã đối tượng dữ liệu bị truy cập. */
    private Long targetId;

    /** Tham chiếu / mô tả đối tượng. */
    private String targetRef;

    /** Địa chỉ IP nguồn. */
    private String ipAddress;

    /** Chi tiết bổ sung. */
    private String detail;

    /** Thời điểm truy cập. */
    private LocalDateTime accessedAt;
}
