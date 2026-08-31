package com.serviceops.common.audit;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.audit.dto.AuditLogPageRes;
import com.serviceops.common.audit.dto.AuditLogSearchReq;
import com.serviceops.common.audit.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API tra cứu nhật ký thao tác nghiệp vụ tổng hợp — trang riêng biệt, có phân trang thật (không còn
 * là danh sách nhúng cuộn tay ở từng màn hình). Chỉ Quản trị viên (VT-07) được xem.
 * Đường dẫn đầy đủ: {@code GET /api/v1/audit-logs}.
 */
@RestController
@RequestMapping("/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class AuditLogController {

	private final AuditLogService auditLogService;

	@GetMapping
	public BaseRes<AuditLogPageRes> search(@Valid AuditLogSearchReq request) {
		return BaseRes.ok(auditLogService.search(request));
	}
}
