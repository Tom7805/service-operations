package com.serviceops.common.audit.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.audit.dto.SensitiveAccessLogPage;
import com.serviceops.common.audit.dto.SensitiveAccessLogSearchReq;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.service.SensitiveAccessLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

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
@Validated
public class SensitiveAccessLogController {

    private final SensitiveAccessLogService service;

    /**
     * Tra cứu nhật ký theo bộ lọc (người dùng, loại dữ liệu, khoảng thời gian) + phân trang.
     */
    @GetMapping
    public BaseRes<SensitiveAccessLogPage> search(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) SensitiveDataType dataType,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest httpRequest) {

        SensitiveAccessLogSearchReq req = new SensitiveAccessLogSearchReq();
        req.setUserId(userId);
        req.setUsername(username);
        req.setDataType(dataType);
        req.setFrom(from);
        req.setTo(to);
        req.setPage(page);
        req.setSize(size);

        return BaseRes.ok(service.search(req));
    }
}
