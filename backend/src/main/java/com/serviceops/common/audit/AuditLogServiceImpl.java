package com.serviceops.common.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    public void record(Long actorUserId, String actorDisplayName, AuditAction action,
                        String targetType, Long targetId, String detail) {
        AuditLog log = AuditLog.builder()
                .actorUserId(actorUserId)
                .actorDisplayName(actorDisplayName)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .detail(detail)
                .build();
        auditLogRepository.save(log);
        AuditLogServiceImpl.log.info("[AUDIT] {} bởi userId={} ({}) trên {}#{}: {}",
                action, actorUserId, actorDisplayName, targetType, targetId, detail);
    }
}
