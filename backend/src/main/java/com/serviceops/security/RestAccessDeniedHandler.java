package com.serviceops.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.api.ErrorResponse;
import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import com.serviceops.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;

/**
 * Tra 403 cho luot bi chan ngay o tang bo loc (truoc khi vao controller) — hien chi xay ra voi quy tac
 * cong khach hang cua {@code SecurityConfig} (QTN-26): tai khoan VT-09 goi API noi bo, hoac tai khoan noi bo
 * goi {@code /portal/**}. Cung khuon dang body va cung ghi Nhat ky he thong "Tu choi truy cap" nhu
 * {@code GlobalExceptionHandler#handleAccessDenied} (luot bi chan boi {@code @PreAuthorize}), de moi lan 403
 * deu co dau vet giong nhau du bi chan o tang nao.
 *
 * <p>Khong phai {@code @Component}: {@code SecurityConfig} tu tao, de cac test {@code @WebMvcTest} chi
 * {@code @Import(SecurityConfig.class)} khong phai khai bao them bean nao.</p>
 */
@Slf4j
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;
    private final ObjectProvider<AccessDeniedAuditRecorder> accessDeniedAuditRecorderProvider;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.warn("ACCESS_DENIED username={} method={} uri={}", username, request.getMethod(), request.getRequestURI());

        AccessDeniedAuditRecorder recorder = accessDeniedAuditRecorderProvider.getIfAvailable();
        if (recorder != null) {
            recorder.record(request.getMethod(), request.getRequestURI());
        }

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(
                ErrorResponse.of(ErrorCode.FORBIDDEN.name(), "Ban khong co quyen thuc hien thao tac nay")));
    }
}
