package com.serviceops.common.audit.repository;

import com.serviceops.common.audit.entity.SensitiveDataAccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * Repository cho bảng {@code sensitive_access_logs}.
 *
 * <p>Kế thừa {@link JpaSpecificationExecutor} để hỗ trợ lọc động
 * (người dùng, loại dữ liệu, khoảng thời gian) theo TC-01 của NCL-01-CN-006.</p>
 */
public interface SensitiveDataAccessLogRepository
        extends JpaRepository<SensitiveDataAccessLog, Long>,
        JpaSpecificationExecutor<SensitiveDataAccessLog> {
}
