package com.serviceops.common.exception;
import com.serviceops.common.api.ErrorResponse;
import com.serviceops.common.api.FieldError;
import com.serviceops.common.audit.AccessDeniedAuditRecorder;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    // ObjectProvider de test @WebMvcTest (khong nap tang JPA) van khoi tao duoc advice nay:
    // getIfAvailable() tra null thay vi lam vo ApplicationContext.
    private final ObjectProvider<AccessDeniedAuditRecorder> accessDeniedAuditRecorderProvider;

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRule(BusinessRuleException ex) {
        HttpStatus status = switch (ex.getErrorCode()) {
            case INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_INACTIVE -> HttpStatus.UNAUTHORIZED;
            case RESOURCE_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case DUPLICATE_DATA -> HttpStatus.CONFLICT;
            case TOO_MANY_REQUESTS -> HttpStatus.TOO_MANY_REQUESTS;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status)
                .body(ErrorResponse.of(ex.getErrorCode().name(), ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : "anonymous";
        log.warn("ACCESS_DENIED username={} method={} uri={}", username, request.getMethod(), request.getRequestURI());

        // Ghi Nhat ky he thong lan tu choi truy cap (su kien bao mat, khong gan ban ghi nghiep vu nao).
        AccessDeniedAuditRecorder recorder = accessDeniedAuditRecorderProvider.getIfAvailable();
        if (recorder != null) {
            recorder.record(request.getMethod(), request.getRequestURI());
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(ErrorCode.FORBIDDEN.name(), "Ban khong co quyen thuc hien thao tac nay"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        List<FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
                .collect(Collectors.toList());

        ErrorResponse body = ErrorResponse.builder()
                .success(false)
                .errorCode(ErrorCode.VALIDATION_ERROR.name())
                .message("Dữ liệu không hợp lệ")
                .timestamp(LocalDateTime.now())
                .fieldErrors(fieldErrors)
                .build();

        return ResponseEntity.badRequest().body(body);
    }

    // Thieu @RequestParam bat buoc (vd GET /me/time-entries thieu weekFrom/weekTo) — truoc day roi
    // xuong handleUnexpected() va tra nham 500 INTERNAL_ERROR thay vi 400 VALIDATION_ERROR.
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException ex) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(ErrorCode.VALIDATION_ERROR.name(),
                        "Thieu tham so bat buoc: " + ex.getParameterName()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(ErrorCode.VALIDATION_ERROR.name(),
                        "Tham so " + ex.getName() + " khong dung dinh dang"));
    }

    // Body thieu, JSON hong hoac sai dinh dang (vd ngay "2026-13-45") — truoc day roi xuong handleUnexpected() va
    // tra nham 500 INTERNAL_ERROR trong khi day la loi do du lieu nguoi dung gui.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(ErrorCode.VALIDATION_ERROR.name(),
                        "Du lieu gui len thieu hoac sai dinh dang"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("UNEXPECTED_ERROR", ex);
        return ResponseEntity.internalServerError()
                .body(ErrorResponse.of(ErrorCode.INTERNAL_ERROR.name(), "Da co loi xay ra, vui long thu lai sau"));
    }
}
