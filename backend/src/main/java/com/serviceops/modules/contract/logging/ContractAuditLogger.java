package com.serviceops.modules.contract.logging;

import com.serviceops.modules.contract.entity.ContractAuditLog;
import com.serviceops.modules.contract.enums.ContractAuditAction;
import com.serviceops.modules.contract.repository.ContractAuditLogRepository;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Ghi nhat ky hop dong (NCL-04, TC-04): nguoi thuc hien, hanh dong, noi dung
 * va thoi diem. Chay trong cung transaction voi thao tac de log khop voi du
 * lieu thuc te - neu giao dich bi rollback thi log cung khong duoc ghi.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContractAuditLogger {

private final ContractAuditLogRepository repository;
private final CurrentUserScopeProvider currentUserScopeProvider;

/**
 * @param contractId hop dong quan tam; NULL neu thao tac khong gan hop dong cu the.
 * @param action     {@link ContractAuditAction}
 * @param detail     noi dung mo ta thao tac.
 */
public void record(Long contractId, ContractAuditAction action, String detail) {
ContractAuditLog audit = new ContractAuditLog();
audit.setContractId(contractId);
audit.setActionType(action);
audit.setDetail(detail);
Long actorId = currentUserScopeProvider.currentUserId();
audit.setActorId(actorId == null ? 0L : actorId);
audit.setActorUsername(currentUsername());
audit.setActorRole(currentRole());
audit.setCreatedAt(LocalDateTime.now());
repository.save(audit);
}

/**
 * Ghi nhat ky truy cap bi tu choi (TC-03) - goi boi ContractAccessDeniedAspect.
 * Aspect chay ngoai transaction nghiep vu (exception nem truoc khi vao method)
 * nen ham nay tu mo transaction doc lap.
 */
@Transactional
public void logDeniedAccess(String targetRef, String detail) {
record(null, ContractAuditAction.DENIED_ACCESS,
"Tu choi truy cap chuc nang hop dong (can Ke toan): " + targetRef + " - " + detail);
log.warn("CONTRACT_DENIED_ACCESS target={} by={}", targetRef,
currentUserScopeProvider.currentUserId());
}

private String currentUsername() {
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
return auth == null ? null : auth.getName();
}

private String currentRole() {
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
if (auth == null) {
return null;
}
return auth.getAuthorities().stream()
.map(GrantedAuthority::getAuthority)
.filter(a -> a.startsWith("ROLE_"))
.map(a -> a.substring("ROLE_".length()))
.findFirst()
.orElse(null);
}
}