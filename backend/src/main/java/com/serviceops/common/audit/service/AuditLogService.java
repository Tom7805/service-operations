package com.serviceops.common.audit.service;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.dto.AuditLogPageRes;
import com.serviceops.common.audit.dto.AuditLogSearchReq;

public interface AuditLogService {

	/**
	 * Ghi một bản ghi nhật ký cho thao tác nghiệp vụ vừa hoàn tất. Người thực hiện được tự động lấy
	 * từ {@code SecurityContextHolder} — nơi gọi không cần truyền actor.
	 */
	void record(String action, AuditTargetType targetType, Long targetId, String targetLabel, String detail);

	AuditLogPageRes search(AuditLogSearchReq request);
}
