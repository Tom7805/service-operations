package com.serviceops.common.audit.service;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.dto.AuditLogPageRes;
import com.serviceops.common.audit.dto.AuditLogRes;
import com.serviceops.common.audit.dto.AuditLogSearchReq;

import java.util.Optional;

public interface AuditLogService {

	/**
	 * Ghi một bản ghi nhật ký cho thao tác nghiệp vụ vừa hoàn tất. Người thực hiện được tự động lấy
	 * từ {@code SecurityContextHolder} — nơi gọi không cần truyền actor.
	 */
	void record(String action, AuditTargetType targetType, Long targetId, String targetLabel, String detail);

	/**
	 * Giống {@link #record} nhưng người thực hiện được truyền tường minh — dùng cho thao tác xảy ra khi
	 * CHƯA có phiên đăng nhập (đăng nhập, khôi phục mật khẩu), lúc {@code SecurityContextHolder} còn
	 * trống. {@code actorUserId}/{@code actorUsername} được phép null (ví dụ gõ sai tên tài khoản).
	 */
	void recordAs(Long actorUserId, String actorUsername, String action, AuditTargetType targetType,
			Long targetId, String targetLabel, String detail);

	AuditLogPageRes search(AuditLogSearchReq request);

	/**
	 * Bản ghi nhật ký sớm nhất của một đối tượng cụ thể — dùng cho các module khác cần biết "ai đã
	 * tạo/thay đổi" một bản ghi nghiệp vụ (ví dụ người khai báo một dòng đơn giá) mà không cần dựng
	 * riêng một bảng lịch sử, tái dùng {@code audit_logs} vốn đã ghi sẵn tại thời điểm tạo
	 * (NCL-07-CN-007). Trả rỗng nếu bản ghi đó được tạo trước khi có audit log (dữ liệu seed cũ).
	 */
	Optional<AuditLogRes> findFirstForTarget(AuditTargetType targetType, Long targetId);
}
