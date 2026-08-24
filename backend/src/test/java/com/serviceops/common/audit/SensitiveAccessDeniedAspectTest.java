package com.serviceops.common.audit;

import com.serviceops.common.audit.enums.SensitiveDataType;
import org.aspectj.lang.JoinPoint;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test {@link SensitiveAccessDeniedAspect} — cover TC-03:
 * khi truy cập bị từ chối thì ghi nhật ký lần từ chối.
 */
@ExtendWith(MockitoExtension.class)
class SensitiveAccessDeniedAspectTest {

    @Mock
    private SensitiveAccessLogger logger;

    @Mock
    private JoinPoint joinPoint;

    @Test
    @DisplayName("TC-03: AccessDeniedException kích hoạt ghi nhật ký lần từ chối")
    void deniedAccessTriggersDenyLog() {
        when(joinPoint.getArgs()).thenReturn(new Object[0]);

        SensitiveAccessDeniedAspect aspect = new SensitiveAccessDeniedAspect(logger);

        aspect.logDenied(joinPoint, new AccessDeniedException("denied"));

        verify(logger).logDenied(any(SensitiveDataType.class), isNull(),
                anyString(), isNull(), anyString());
    }
}
