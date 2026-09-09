package com.serviceops.common.audit;

import com.serviceops.common.audit.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Ghi một bản ghi <b>"Từ chối truy cập"</b> vào Nhật ký hệ thống ({@code audit_logs}).
 *
 * <p>Một dòng nhật ký = [Ai + vai trò] – [Hành động] – [Đối tượng] – [Chi tiết]. Lượt bị chặn quyền
 * không tác động lên bản ghi nghiệp vụ nào:</p>
 * <ul>
 *   <li>{@code action}      = "Từ chối truy cập"</li>
 *   <li>{@code targetType}  = phân loại theo mô-đun (chỉ dùng để LỌC, không hiển thị cột)</li>
 *   <li>{@code targetLabel} = tên chức năng dễ đọc (VD "Gộp hồ sơ khách hàng trùng")</li>
 *   <li>{@code targetId}    = null</li>
 *   <li>{@code detail}      = câu mô tả ngắn; chỉ ghi kèm {@code METHOD /đường-dẫn} khi không nhận ra chức năng</li>
 * </ul>
 * <p>Người thực hiện + vai trò do {@code AuditLogService.record} tự điền từ phiên đăng nhập.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AccessDeniedAuditRecorder {

    /**
     * Chuỗi con trong đường dẫn -> (phân loại để lọc, tên chức năng dễ đọc). Xét lần lượt, lấy khớp
     * đầu tiên nên mục cụ thể hơn phải đứng trước (VD "/customers/merge" trước "/customers").
     */
    private static final Map<String, Feature> FEATURES = new LinkedHashMap<>();

    static {
        FEATURES.put("/customers/merge", new Feature(AuditTargetType.CUSTOMER, "Gộp hồ sơ khách hàng trùng"));
        FEATURES.put("/contacts", new Feature(AuditTargetType.CUSTOMER, "Người liên hệ của khách hàng"));
        FEATURES.put("/customers", new Feature(AuditTargetType.CUSTOMER, "Hồ sơ khách hàng"));
        FEATURES.put("/activities", new Feature(AuditTargetType.GENERAL, "Hoạt động chăm sóc cơ hội"));
        FEATURES.put("/quotes", new Feature(AuditTargetType.GENERAL, "Báo giá cơ hội"));
        FEATURES.put("/budget", new Feature(AuditTargetType.GENERAL, "Đặt ngân sách giờ công cho công việc"));
        FEATURES.put("/tasks", new Feature(AuditTargetType.GENERAL, "Cập nhật tiến độ công việc dự án"));
        FEATURES.put("/contracts", new Feature(AuditTargetType.GENERAL, "Tạo dự án từ hợp đồng"));
        FEATURES.put("/opportunities", new Feature(AuditTargetType.GENERAL, "Cơ hội bán hàng"));
        FEATURES.put("/audit-logs", new Feature(AuditTargetType.GENERAL, "Nhật ký hệ thống"));
        FEATURES.put("/sensitive-access-logs", new Feature(AuditTargetType.MASKING, "Nhật ký truy cập dữ liệu nhạy cảm"));
        FEATURES.put("/masking-rules", new Feature(AuditTargetType.MASKING, "Cấu hình che dữ liệu nhạy cảm"));
        FEATURES.put("/roles", new Feature(AuditTargetType.ROLE_SCOPE, "Phân quyền"));
        FEATURES.put("/users", new Feature(AuditTargetType.USER, "Quản lý tài khoản"));
        FEATURES.put("/employees", new Feature(AuditTargetType.USER, "Quản lý nhân sự"));
        FEATURES.put("/departments", new Feature(AuditTargetType.DEPARTMENT, "Quản lý tổ chức"));
        FEATURES.put("/auth/two-factor", new Feature(AuditTargetType.TWO_FACTOR, "Xác thực hai bước"));
    }

    private final AuditLogService auditLogService;

    /** Ghi log; nuốt mọi lỗi để không làm hỏng response 403 trả về cho người dùng. */
    public void record(String httpMethod, String requestUri) {
        try {
            Feature feature = resolveFeature(requestUri);
            String detail = feature != null
                    ? "Bị từ chối truy cập chức năng " + feature.label() + "."
                    : "Bị từ chối truy cập: " + httpMethod + " " + requestUri;

            auditLogService.record(
                    "Từ chối truy cập",
                    feature != null ? feature.type() : AuditTargetType.GENERAL,
                    null,
                    feature != null ? feature.label() : null,
                    detail);

            log.info("Da ghi Nhat ky he thong lan tu choi truy cap: {} {} ({})",
                    httpMethod, requestUri, currentUsername());
        } catch (RuntimeException loggingFailure) {
            log.warn("Khong ghi duoc nhat ky lan tu choi truy cap vao he thong", loggingFailure);
        }
    }

    private Feature resolveFeature(String requestUri) {
        if (requestUri == null) {
            return null;
        }
        for (Map.Entry<String, Feature> entry : FEATURES.entrySet()) {
            if (requestUri.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "khách vãng lai";
    }

    private record Feature(AuditTargetType type, String label) {
    }
}
