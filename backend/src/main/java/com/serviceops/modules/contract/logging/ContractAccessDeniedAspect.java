package com.serviceops.modules.contract.logging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Ghi nhat ky lan tu choi truy cap vao chuc nang hop dong (NCL-04-CN-002, TC-03:
 * nguoi khong phai Ke toan mo chuc nang khai bao loai hop dong va han muc).
 *
 * <p>Khi {@code @PreAuthorize("hasRole('VT-05')")} chan yeu cau,
 * {@link AccessDeniedException} duoc nem ra truoc khi vao method. Aspect nay ghi
 * nhat ky {@code DENIED_ACCESS} vao contract_audit_logs roi nem tiep de
 * {@code GlobalExceptionHandler} tra ve {@code 403 FORBIDDEN} - trung lap mau
 * voi {@code OpportunityAccessDeniedAspect} cua module co hoi.</p>
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class ContractAccessDeniedAspect {

private final ContractAuditLogger auditLogger;

@AfterThrowing(
pointcut = "within(com.serviceops.modules.contract.controller..*)",
throwing = "ex")
public void logDenied(JoinPoint joinPoint, AccessDeniedException ex) {
try {
auditLogger.logDeniedAccess(joinPoint.getSignature().toShortString(),
"Yeu cau vai tro Ke toan (VT-05)");
} catch (RuntimeException loggingFailure) {
// Khong duoc lam hong trai nghiem tra ve 403 cua request goc.
log.warn("Khong ghi duoc nhat ky lan tu choi truy cap chuc nang hop dong", loggingFailure);
}
}
}