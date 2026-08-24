package com.serviceops.common.audit;

import com.serviceops.common.audit.controller.SensitiveAccessLogController;
import com.serviceops.common.audit.enums.SensitiveDataType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/**
 * Ghi nhật ký lần <b>từ chối truy cập</b> nhật ký dữ liệu nhạy cảm (TC-03, QTN-01/QTN-03).
 *
 * <p>Khi {@code @PreAuthorize("hasRole('VT-07')")} chặn một yêu cầu tới
 * {@link SensitiveAccessLogController}, {@link AccessDeniedException} được ném ra
 * trước khi vào method — aspect này bắt ngoại lệ đó, ghi nhật ký {@code DENIED}
 * rồi ném lại để {@code GlobalExceptionHandler} trả về {@code 403 FORBIDDEN}.</p>
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class SensitiveAccessDeniedAspect {

    private final SensitiveAccessLogger logger;

    @AfterThrowing(
            pointcut = "within(com.serviceops.common.audit.controller..*)",
            throwing = "ex")
    public void logDenied(JoinPoint joinPoint, AccessDeniedException ex) {
        try {
            logger.logDenied(SensitiveDataType.SALARY, null, "sensitive-access-log",
                    ipFromArgs(joinPoint), "Truy cap nhat ky du lieu nhay cam bi tu choi");
        } catch (RuntimeException loggingFailure) {
            // Khong duoc lam hong trai nghiem tra ve 403 cua request goc.
            log.warn("Khong ghi duoc nhat ky lan tu choi truy cap nhat ky nhanh cam", loggingFailure);
        }
    }

    /** Cố gắng trích IP từ đối số {@code HttpServletRequest} của method controller (nếu có). */
    private String ipFromArgs(JoinPoint joinPoint) {
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof jakarta.servlet.http.HttpServletRequest request) {
                String forwarded = request.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
                return request.getRemoteAddr();
            }
        }
        return null;
    }
}
