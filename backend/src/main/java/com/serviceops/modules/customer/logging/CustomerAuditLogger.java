package com.serviceops.modules.customer.logging;

import com.serviceops.modules.customer.entity.CustomerAuditLog;
import com.serviceops.modules.customer.enums.CustomerAuditAction;
import com.serviceops.modules.customer.repository.CustomerAuditLogRepository;
import com.serviceops.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;


@Service
@RequiredArgsConstructor
public class CustomerAuditLogger {

    private final CustomerAuditLogRepository repository;


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logDeniedAccess(String targetRef, String detail) {
        CustomerAuditLog log = new CustomerAuditLog();
        log.setActionType(CustomerAuditAction.DENIED_ACCESS);
        log.setDetail(detail);
        log.setCustomerId(null);
        currentUser().ifPresent(user -> {
            log.setActorUserId(user.getId());
            log.setActorUsername(user.getUsername());
        });
        log.setCreatedAt(LocalDateTime.now());
        repository.save(log);
    }

    /** Lấy người dùng hiện tại từ {@link SecurityContextHolder}; rỗng nếu chưa xác thực. */
    private Optional<CustomUserDetails> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails user)) {
            return Optional.empty();
        }
        return Optional.of(user);
    }
}