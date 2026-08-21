package com.serviceops.common.audit.service;

import com.serviceops.common.audit.dto.SensitiveAccessLogPage;
import com.serviceops.common.audit.dto.SensitiveAccessLogRes;
import com.serviceops.common.audit.dto.SensitiveAccessLogSearchReq;
import com.serviceops.common.audit.entity.SensitiveDataAccessLog;
import com.serviceops.common.audit.enums.AccessAction;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.repository.SensitiveDataAccessLogRepository;
import com.serviceops.common.audit.service.impl.SensitiveAccessLogServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Import;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit test tra cứu nhật ký truy cập dữ liệu nhạy cảm.
 *
 * <p>Cover TC-01 (lọc theo người dùng, loại dữ liệu, khoảng thời gian) và
 * TC-02 (không có bản ghi trong khoảng → danh sách rỗng).</p>
 */
@DataJpaTest(properties = "spring.flyway.enabled=false")
@Import(SensitiveAccessLogServiceImpl.class)
@ActiveProfiles("test")
class SensitiveAccessLogServiceTest {

    @Autowired
    private SensitiveDataAccessLogRepository repository;

    @Autowired
    private SensitiveAccessLogServiceImpl service;

    private final LocalDateTime t1 = LocalDateTime.of(2026, 8, 1, 9, 0);
    private final LocalDateTime t2 = LocalDateTime.of(2026, 8, 2, 10, 30);
    private final LocalDateTime t3 = LocalDateTime.of(2026, 8, 5, 14, 45);

    private SensitiveDataAccessLog log(Long userId, String username,
                                       SensitiveDataType dataType, AccessAction action,
                                       LocalDateTime at) {
        SensitiveDataAccessLog l = new SensitiveDataAccessLog();
        l.setUserId(userId);
        l.setUsername(username);
        l.setDataType(dataType);
        l.setAction(action);
        l.setAccessedAt(at);
        return l;
    }

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        repository.save(log(1L, "admin", SensitiveDataType.SALARY, AccessAction.VIEW, t1));
        repository.save(log(1L, "admin", SensitiveDataType.MARGIN, AccessAction.EXPORT, t2));
        repository.save(log(2L, "employee", SensitiveDataType.COST, AccessAction.VIEW, t3));
    }

    private SensitiveAccessLogSearchReq req() {
        SensitiveAccessLogSearchReq r = new SensitiveAccessLogSearchReq();
        r.setPage(0);
        r.setSize(10);
        return r;
    }

    @Test
    @DisplayName("TC-01: lọc theo người dùng và khoảng thời gian")
    void searchByUserAndRange() {
        SensitiveAccessLogSearchReq r = req();
        r.setUserId(1L);
        r.setFrom(t1.minusMinutes(1));
        r.setTo(t2.plusMinutes(1));

        SensitiveAccessLogPage page = service.search(r);

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(SensitiveAccessLogRes::getUserId)
                .containsOnly(1L);
        assertThat(page.getContent()).extracting(SensitiveAccessLogRes::getAccessedAt)
                .containsExactlyInAnyOrder(t1, t2);
    }

    @Test
    @DisplayName("TC-01b: lọc theo loại dữ liệu SALARY")
    void searchByDataType() {
        SensitiveAccessLogSearchReq r = req();
        r.setDataType(SensitiveDataType.SALARY);

        SensitiveAccessLogPage page = service.search(r);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent())
                .extracting(SensitiveAccessLogRes::getDataType)
                .containsExactly(SensitiveDataType.SALARY);
    }

    @Test
    @DisplayName("TC-02: không có bản ghi trong khoảng → danh sách rỗng")
    void searchEmptyRange() {
        SensitiveAccessLogSearchReq r = req();
        r.setFrom(LocalDateTime.of(2030, 1, 1, 0, 0));
        r.setTo(LocalDateTime.of(2031, 1, 1, 0, 0));

        SensitiveAccessLogPage page = service.search(r);

        assertThat(page.getTotalElements()).isZero();
        assertThat(page.getContent()).isEmpty();
    }

    @Test
    @DisplayName("Sắp xếp mới nhất trước")
    void sortedNewestFirst() {
        SensitiveAccessLogPage page = service.search(req());

        // sắp xếp theo accessedAt DESC: t3 (08-05), t2 (08-02), t1 (08-01)
        assertThat(page.getContent()).hasSize(3);
        assertThat(page.getContent().get(0).getAccessedAt()).isEqualTo(t3);
        assertThat(page.getContent().get(2).getAccessedAt()).isEqualTo(t1);
    }
}
