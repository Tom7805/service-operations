package com.serviceops.modules.opportunity.logging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Ghi nhat ky lan <b>tu choi truy cap</b> vao chuc nang co hoi ban hang (TC-03).
 *
 * <p>Khi {@code @PreAuthorize("hasRole('VT-04')")} chan yeu cau (nguoi dung khong
 * phai Nhan vien kinh doanh), {@link AccessDeniedException} duoc nem ra truoc khi
 * vao method. Aspect nay ghi nhat ky {@code DENIED_ACCESS} roi nem tiep de
 * {@code GlobalExceptionHandler} tra ve {@code 403 FORBIDDEN}.</p>
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class OpportunityAccessDeniedAspect {

	private final OpportunityAuditLogger auditLogger;

	@AfterThrowing(
			pointcut = "within(com.serviceops.modules.opportunity.controller..*)",
			throwing = "ex")
	public void logDenied(JoinPoint joinPoint, AccessDeniedException ex) {
		try {
			auditLogger.logDeniedAccess(joinPoint.getSignature().toShortString(),
					"Tu choi truy cap chuc nang co hoi ban hang (can Nhan vien kinh doanh)");
		} catch (RuntimeException loggingFailure) {
			// Khong duoc lam hong trai nghiem tra ve 403 cua request goc.
			log.warn("Khong ghi duoc nhat ky lan tu choi truy cap chuc nang co hoi", loggingFailure);
		}
	}
}