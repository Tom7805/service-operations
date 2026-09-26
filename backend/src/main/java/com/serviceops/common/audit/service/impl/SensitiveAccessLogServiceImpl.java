package com.serviceops.common.audit.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.dto.SensitiveAccessLogPage;
import com.serviceops.common.audit.dto.SensitiveAccessLogRes;
import com.serviceops.common.audit.dto.SensitiveAccessLogSearchReq;
import com.serviceops.common.audit.entity.SensitiveDataAccessLog;
import com.serviceops.common.audit.repository.SensitiveDataAccessLogRepository;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.audit.service.SensitiveAccessLogService;
import com.serviceops.common.audit.specification.SensitiveAccessLogSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Triển khai tra cứu nhật ký truy cập dữ liệu nhạy cảm.
 */
@Service
@RequiredArgsConstructor
public class SensitiveAccessLogServiceImpl implements SensitiveAccessLogService {

    private final SensitiveDataAccessLogRepository repository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public SensitiveAccessLogPage search(SensitiveAccessLogSearchReq req) {
        Specification<SensitiveDataAccessLog> spec = SensitiveAccessLogSpecification.from(req);

        // Sắp xếp mới nhất trước — admin cần thấy các truy cập gần đây nhất.
        PageRequest pageRequest = PageRequest.of(req.getPage(), req.getSize(),
                Sort.by(Sort.Direction.DESC, "accessedAt"));

        Page<SensitiveDataAccessLog> page = repository.findAll(spec, pageRequest);

        List<SensitiveAccessLogRes> content = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        // NCL-01-CN-006-TC-04: moi lan tra cuu moi (trang dau) deu de lai dau vet ai da xem nhat ky nhay cam.
        if (req.getPage() == 0) {
            auditLogService.record("Tra cứu nhật ký dữ liệu nhạy cảm", AuditTargetType.MASKING, null,
                    "Nhật ký truy cập dữ liệu nhạy cảm", describeFilter(req, page.getTotalElements()));
        }

        return new SensitiveAccessLogPage(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }

    private static String describeFilter(SensitiveAccessLogSearchReq req, long total) {
        StringBuilder sb = new StringBuilder("Lọc");
        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            sb.append(" theo người dùng \"").append(req.getUsername().trim()).append("\"");
        } else if (req.getUserId() != null) {
            sb.append(" theo người dùng #").append(req.getUserId());
        }
        if (req.getDataType() != null) {
            sb.append(", loại dữ liệu ").append(req.getDataType());
        }
        if (req.getFrom() != null || req.getTo() != null) {
            sb.append(", từ ").append(req.getFrom() != null ? req.getFrom().toLocalDate() : "…")
                    .append(" đến ").append(req.getTo() != null ? req.getTo().toLocalDate() : "…");
        }
        return sb.append(" — ").append(total).append(" bản ghi.").toString();
    }

    private SensitiveAccessLogRes toResponse(SensitiveDataAccessLog log) {
        return new SensitiveAccessLogRes(
                log.getId(),
                log.getUserId(),
                log.getUsername(),
                log.getAction(),
                log.getDataType(),
                log.getTargetId(),
                log.getTargetRef(),
                log.getIpAddress(),
                log.getDetail(),
                log.getAccessedAt());
    }
}
