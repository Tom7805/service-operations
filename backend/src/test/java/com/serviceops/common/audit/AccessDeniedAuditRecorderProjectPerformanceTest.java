package com.serviceops.common.audit;

import com.serviceops.common.audit.service.AuditLogService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

/** NCL-11-CN-003-TC-03: lần từ chối vào báo cáo hiệu quả theo dự án phải mang đúng tên chức năng. */
@ExtendWith(MockitoExtension.class)
class AccessDeniedAuditRecorderProjectPerformanceTest {

	@Mock
	private AuditLogService auditLogService;

	@Test
	void labelsDeniedProjectPerformanceReportRequestAsItsOwnFeature() {
		new AccessDeniedAuditRecorder(auditLogService).record("GET", "/api/v1/reports/project-performance/42");

		verify(auditLogService).record(eq("Từ chối truy cập"), eq(AuditTargetType.GENERAL), isNull(),
				eq("Báo cáo hiệu quả theo dự án"), anyString());
	}
}
