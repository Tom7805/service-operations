package com.serviceops.common.audit.specification;

import com.serviceops.common.audit.dto.SensitiveAccessLogSearchReq;
import com.serviceops.common.audit.entity.SensitiveDataAccessLog;
import org.springframework.data.jpa.domain.Specification;

/**
 * Specification lọc động bảng nhật ký truy cập dữ liệu nhạy cảm.
 * Đáp ứng TC-01: lọc theo người dùng, loại dữ liệu và khoảng thời gian.
 */
public final class SensitiveAccessLogSpecification {

    private SensitiveAccessLogSpecification() {
    }

    /**
     * Dựng Specification từ bộ lọc {@code req}.
     * Các điều kiện chỉ được áp dụng khi trường tương ứng khác rỗng/null.
     */
    public static Specification<SensitiveDataAccessLog> from(SensitiveAccessLogSearchReq req) {
        Specification<SensitiveDataAccessLog> spec = Specification.where(null);

        if (req.getUserId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("userId"), req.getUserId()));
        }

        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            String like = "%" + req.getUsername().trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("username")), like));
        }

        if (req.getDataType() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("dataType"), req.getDataType()));
        }

        if (req.getFrom() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("accessedAt"), req.getFrom()));
        }

        if (req.getTo() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("accessedAt"), req.getTo()));
        }

        return spec;
    }
}
