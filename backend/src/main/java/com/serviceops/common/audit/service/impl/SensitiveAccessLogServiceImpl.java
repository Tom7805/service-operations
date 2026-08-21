package com.serviceops.common.audit.service.impl;

import com.serviceops.common.audit.dto.SensitiveAccessLogPage;
import com.serviceops.common.audit.dto.SensitiveAccessLogRes;
import com.serviceops.common.audit.dto.SensitiveAccessLogSearchReq;
import com.serviceops.common.audit.entity.SensitiveDataAccessLog;
import com.serviceops.common.audit.repository.SensitiveDataAccessLogRepository;
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

        return new SensitiveAccessLogPage(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
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
