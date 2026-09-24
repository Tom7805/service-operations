package com.serviceops.common.audit;

import com.serviceops.common.audit.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

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
     * Quy tắc nhận diện chức năng theo đường dẫn, xét LẦN LƯỢT theo đúng thứ tự khai báo và dừng ở
     * quy tắc khớp đầu tiên — nên quy tắc cụ thể hơn phải đứng trước quy tắc chung hơn (VD
     * "/customers/merge" trước "/customers"). Phần lớn quy tắc chỉ so một chuỗi con ({@link #rule});
     * vài trường hợp hai chức năng khác nhau cùng chứa một chuỗi con (VD cả mốc thanh toán hợp đồng
     * lẫn lập hóa đơn theo mốc đều có "/contracts/{id}/milestones") thì dùng điều kiện ghép
     * ({@link #rule(Predicate, Feature)}) và đặt đúng vị trí xen giữa các quy tắc khác thay vì gộp
     * vào một khoá chuỗi con duy nhất.
     */
    private static final List<Rule> RULES = new ArrayList<>();

    static {
        // Phải đứng trước "/invoice": "/invoice-proposals" cũng chứa chuỗi "/invoice".
        RULES.add(rule("/invoice-proposals", new Feature(AuditTargetType.INVOICE, "Tạo đề nghị xuất hóa đơn từ giờ công")));
        RULES.add(rule("/receivables", new Feature(AuditTargetType.INVOICE, "Theo dõi công nợ quá hạn")));
        // Phải đứng trước "/contracts": "/contracts/{id}/recurring-invoice-schedule" chứa cả hai chuỗi này.
        // Bắt cả "/recurring-invoice-schedule" (CRUD điều khoản) lẫn "/recurring-invoices/run" (rà soát).
        RULES.add(rule("/recurring-invoice", new Feature(AuditTargetType.INVOICE, "Hóa đơn định kỳ cho hợp đồng duy trì")));
        // "/dunning" khớp cả "/dunning/run" lẫn "/invoices/{id}/dunning-logs" (chuỗi con) nên phải đứng
        // trước "/invoices" ở dưới, tránh bị nhãn "Tra cứu hóa đơn và công nợ" khi tra lịch sử nhắc nợ.
        RULES.add(rule("/dunning", new Feature(AuditTargetType.INVOICE, "Nhắc thu nợ tự động")));
        // "/payments" phải đứng trước "/invoice": đường dẫn /invoices/{id}/payments chứa cả hai chuỗi này.
        RULES.add(rule("/payments", new Feature(AuditTargetType.INVOICE, "Ghi nhận thanh toán của khách hàng")));
        // "/invoices" (tra cứu) phải đứng trước "/invoice": "/invoice" là tiền tố của "/invoices" nên nếu đảo thứ tự,
        // lượt bị từ chối khi tra cứu hóa đơn sẽ bị gắn nhãn "Lập hóa đơn theo mốc hợp đồng".
        RULES.add(rule("/invoices", new Feature(AuditTargetType.INVOICE, "Tra cứu hóa đơn và công nợ")));
        // Phải đứng trước "/milestones" và "/contracts": đường dẫn lập hóa đơn theo mốc
        // ("/contracts/{id}/milestones/{id}/invoice") chứa cả ba chuỗi này.
        RULES.add(rule("/invoice", new Feature(AuditTargetType.INVOICE, "Lập hóa đơn theo mốc hợp đồng")));
        RULES.add(rule("/reports/margin/by-customer", new Feature(AuditTargetType.GENERAL, "Báo cáo biên lợi nhuận theo khách hàng")));
        RULES.add(rule("/reports/margin/by-employee", new Feature(AuditTargetType.GENERAL, "Báo cáo biên lợi nhuận theo nhân sự")));
        RULES.add(rule("/reports/dashboard", new Feature(AuditTargetType.GENERAL, "Bảng điều khiển vận hành")));
        // "/contracts/{id}/milestones..." (NCL-04-CN-003, mốc thanh toán hợp đồng) và
        // "/projects/{id}/milestones..." (NCL-05-CN-008, mốc tiến độ dự án) đều chứa chuỗi con
        // "/milestones" nên không phân biệt được bằng một khoá chuỗi con — bắt riêng nhánh hợp đồng ở
        // đây, TRƯỚC quy tắc "/milestones" chung ngay dưới (vốn chỉ đúng cho nhánh dự án). Quy tắc
        // "/invoice" phía trên đã bắt xong đường dẫn lập hóa đơn theo mốc nên không bị lẫn vào đây.
        RULES.add(rule(uri -> uri.contains("/contracts/") && uri.contains("/milestones"),
                new Feature(AuditTargetType.GENERAL, "Quản lý mốc thanh toán của hợp đồng")));
        RULES.add(rule("/milestones", new Feature(AuditTargetType.GENERAL, "Quản lý mốc tiến độ dự án")));
        RULES.add(rule("/risks", new Feature(AuditTargetType.GENERAL, "Quản lý rủi ro dự án")));
        RULES.add(rule("/projects/from-template", new Feature(AuditTargetType.GENERAL, "Tạo dự án từ mẫu")));
        RULES.add(rule("/customers/merge", new Feature(AuditTargetType.CUSTOMER, "Gộp hồ sơ khách hàng trùng")));
        RULES.add(rule("/contacts", new Feature(AuditTargetType.CUSTOMER, "Người liên hệ của khách hàng")));
        RULES.add(rule("/customers", new Feature(AuditTargetType.CUSTOMER, "Hồ sơ khách hàng")));
        RULES.add(rule("/activities", new Feature(AuditTargetType.GENERAL, "Hoạt động chăm sóc cơ hội")));
        RULES.add(rule("/quotes", new Feature(AuditTargetType.GENERAL, "Báo giá cơ hội")));
        RULES.add(rule("/margin-alert-threshold", new Feature(AuditTargetType.GENERAL, "Ngưỡng cảnh báo dự án âm biên")));
        RULES.add(rule("/bill-rates", new Feature(AuditTargetType.GENERAL, "Khai báo bảng đơn giá theo vai trò")));
        RULES.add(rule("/overhead-allocations", new Feature(AuditTargetType.EXPENSE, "Phân bổ chi phí chung cho dự án")));
        RULES.add(rule("/timesheet-periods", new Feature(AuditTargetType.TIMESHEET, "Khóa kỳ chấm công")));
        RULES.add(rule("/reversal", new Feature(AuditTargetType.TIMESHEET, "Điều chỉnh giờ công bằng bút toán đảo")));
        RULES.add(rule("/adjustments", new Feature(AuditTargetType.TIMESHEET, "Điều chỉnh giờ công bằng bút toán đảo")));
        RULES.add(rule("/time-entries", new Feature(AuditTargetType.GENERAL, "Ghi giờ công theo công việc")));
        RULES.add(rule("/timesheets/pending", new Feature(AuditTargetType.TIMESHEET, "Duyệt bảng chấm công")));
        RULES.add(rule("/timesheets/approval-history", new Feature(AuditTargetType.TIMESHEET, "Duyệt bảng chấm công")));
        RULES.add(rule("/approve", new Feature(AuditTargetType.TIMESHEET, "Duyệt bảng chấm công")));
        RULES.add(rule("/reject", new Feature(AuditTargetType.TIMESHEET, "Từ chối bảng chấm công")));
        RULES.add(rule("/timesheets", new Feature(AuditTargetType.TIMESHEET, "Nộp bảng chấm công theo tuần")));
        RULES.add(rule("/budget", new Feature(AuditTargetType.GENERAL, "Đặt ngân sách giờ công cho công việc")));
        RULES.add(rule("/tasks", new Feature(AuditTargetType.GENERAL, "Cập nhật tiến độ công việc dự án")));
        RULES.add(rule("/contracts", new Feature(AuditTargetType.GENERAL, "Tạo dự án từ hợp đồng")));
        RULES.add(rule("/opportunities", new Feature(AuditTargetType.GENERAL, "Cơ hội bán hàng")));
        RULES.add(rule("/close", new Feature(AuditTargetType.GENERAL, "Đóng dự án")));
        RULES.add(rule("/audit-logs", new Feature(AuditTargetType.GENERAL, "Nhật ký hệ thống")));
        RULES.add(rule("/sensitive-access-logs", new Feature(AuditTargetType.MASKING, "Nhật ký truy cập dữ liệu nhạy cảm")));
        RULES.add(rule("/masking-rules", new Feature(AuditTargetType.MASKING, "Cấu hình che dữ liệu nhạy cảm")));
        RULES.add(rule("/roles", new Feature(AuditTargetType.ROLE_SCOPE, "Phân quyền")));
        RULES.add(rule("/users", new Feature(AuditTargetType.USER, "Quản lý tài khoản")));
        RULES.add(rule("/rates", new Feature(AuditTargetType.MASKING, "Chi phí giờ công nội bộ")));
        RULES.add(rule("/employees", new Feature(AuditTargetType.USER, "Quản lý nhân sự")));
        RULES.add(rule("/departments", new Feature(AuditTargetType.DEPARTMENT, "Quản lý tổ chức")));
        RULES.add(rule("/auth/two-factor", new Feature(AuditTargetType.TWO_FACTOR, "Xác thực hai bước")));
    }

    private static Rule rule(String substring, Feature feature) {
        return new Rule(uri -> uri.contains(substring), feature);
    }

    private static Rule rule(Predicate<String> matcher, Feature feature) {
        return new Rule(matcher, feature);
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
        for (Rule rule : RULES) {
            if (rule.matcher().test(requestUri)) {
                return rule.feature();
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

    private record Rule(Predicate<String> matcher, Feature feature) {
    }
}
