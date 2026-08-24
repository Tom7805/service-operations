package com.serviceops.common.audit.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.audit.dto.SensitiveAccessLogPage;
import com.serviceops.common.audit.dto.SensitiveAccessLogSearchReq;
import com.serviceops.common.audit.service.SensitiveAccessLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API tra cứu nhật ký truy cập dữ liệu nhạy cảm (NCL-01-CN-006).
 *
 * <p>Chỉ <b>Quản trị viên</b> (role {@code VT-07}) được truy cập (TC-03).
 * Đường dẫn đầy đủ: {@code GET /api/v1/sensitive-access-logs}.</p>
 */
@RestController
@RequestMapping("/sensitive-access-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class SensitiveAccessLogController {

    private final SensitiveAccessLogService service;

    /**
     * Tra cứu nhật ký theo bộ lọc (người dùng, loại dữ liệu, khoảng thời gian) + phân trang.
     *
     * <p>Bộ lọc được bind trực tiếp vào {@link SensitiveAccessLogSearchReq} từ query params
     * (Spring tự map {@code userId}, {@code username}, {@code dataType}, {@code from}, {@code to},
     * {@code page}, {@code size}) — {@code @Valid} ở đây là bắt buộc để các ràng buộc
     * {@code @Min}/{@code @Max} trên {@code page}/{@code size} thực sự được kiểm tra
     * (nếu chỉ khai báo trên DTO mà không có {@code @Valid} trên tham số controller thì Spring
     * sẽ không bao giờ chạy validation, dẫn tới {@code size} âm/quá lớn lọt qua tới tầng service).
     */
    @GetMapping
    public BaseRes<SensitiveAccessLogPage> search(@Valid SensitiveAccessLogSearchReq req) {
        return BaseRes.ok(service.search(req));
    }
}
