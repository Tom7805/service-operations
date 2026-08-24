package com.serviceops.common.audit;

import com.serviceops.common.audit.entity.SensitiveDataAccessLog;
import com.serviceops.common.audit.enums.AccessAction;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.common.audit.repository.SensitiveDataAccessLogRepository;
import com.serviceops.security.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test {@link SensitiveAccessLogger} — cover TC-04:
 * ghi lại đầy đủ người thực hiện, nội dung và thời điểm.
 */
@ExtendWith(MockitoExtension.class)
class SensitiveAccessLoggerTest {

    @Mock
    private SensitiveDataAccessLogRepository repository;

    private SensitiveAccessLogger logger;

    private CustomUserDetails user;

    @BeforeEach
    void setUp() {
        logger = new SensitiveAccessLogger(repository);
        User userEntity = new User();
        userEntity.setId(1L);
        userEntity.setUsername("admin");
        user = new CustomUserDetails(userEntity, List.of());
        // đặt người dùng hiện tại vào SecurityContext
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("TC-04: logView ghi đủ người thực hiện, loại dữ liệu, thời điểm")
    void logViewRecordsActorContentAndTime() {
        when(repository.save(org.mockito.ArgumentMatchers.any(SensitiveDataAccessLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        logger.logView(SensitiveDataType.SALARY, 10L, "NhanVien/10", "Xem bang luong");

        ArgumentCaptor<SensitiveDataAccessLog> captor = ArgumentCaptor.forClass(SensitiveDataAccessLog.class);
        verify(repository).save(captor.capture());
        SensitiveDataAccessLog saved = captor.getValue();

        assertThat(saved.getAction()).isEqualTo(AccessAction.VIEW);
        assertThat(saved.getDataType()).isEqualTo(SensitiveDataType.SALARY);
        assertThat(saved.getUserId()).isEqualTo(1L);
        assertThat(saved.getUsername()).isEqualTo("admin");
        assertThat(saved.getTargetId()).isEqualTo(10L);
        assertThat(saved.getTargetRef()).isEqualTo("NhanVien/10");
        assertThat(saved.getAccessedAt()).isNotNull();
    }

    @Test
    @DisplayName("TC-04: logExport ghi nhận hành động xuất")
    void logExportRecordsExportAction() {
        when(repository.save(org.mockito.ArgumentMatchers.any(SensitiveDataAccessLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        logger.logExport(SensitiveDataType.MARGIN, 5L, "DuAn/5", "Xuat bao cao bien loi nhuan");

        ArgumentCaptor<SensitiveDataAccessLog> captor = ArgumentCaptor.forClass(SensitiveDataAccessLog.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getAction()).isEqualTo(AccessAction.EXPORT);
        assertThat(captor.getValue().getDataType()).isEqualTo(SensitiveDataType.MARGIN);
    }

    @Test
    @DisplayName("TC-04: logDenied ghi nhận hành động bị từ chối kèm IP")
    void logDeniedRecordsDeniedWithIp() {
        when(repository.save(org.mockito.ArgumentMatchers.any(SensitiveDataAccessLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        logger.logDenied(SensitiveDataType.COST, null, "sensitive-access-log", "203.0.113.7", "Bi tu choi");

        ArgumentCaptor<SensitiveDataAccessLog> captor = ArgumentCaptor.forClass(SensitiveDataAccessLog.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getAction()).isEqualTo(AccessAction.DENIED);
        assertThat(captor.getValue().getIpAddress()).isEqualTo("203.0.113.7");
    }
}
