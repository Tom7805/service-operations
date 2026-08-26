package com.serviceops.modules.customer.logging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Ghi nhat ky lan <b>tu choi truy cap</b> vao cac chuc nang khach hang (TC-04).
 *
 * <p>Khi {@code @PreAuthorize("hasRole('VT-04') or hasRole('VT-02')")} chan yeu cau
 * (nguoi dung khong phai Sales/PM), {@link AccessDeniedException} duoc nem ra truoc
 * khi vao method. Aspect nay ghi nhat ky {@code DENIED_ACCESS} roi nem tiep de
 * {@code GlobalExceptionHandler} tra ve {@code 403 FORBIDDEN}.</p>
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class CustomerDuplicateAccessDeniedAspect {

    private final CustomerAuditLogger logger;

    @AfterThrowing(
            pointcut = "within(com.serviceops.modules.customer.controller..*)",
            throwing = "ex")
    public void logDenied(JoinPoint joinPoint, AccessDeniedException ex) {
        try {
            logger.logDeniedAccess(joinPoint.getSignature().toShortString(),
                    "Tu choi truy cap chuc nang khach hang (can Sales hoac PM)");
        } catch (RuntimeException loggingFailure) {
            // Khong duoc lam hong trai nghiem tra ve 403 cua request goc.
            log.warn("Khong ghi duoc nhat ky lan tu choi truy cap chuc nang khach hang", loggingFailure);
        }
    }
}