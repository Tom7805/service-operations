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

/** NCL-11-CN-004-TC-03: lần từ chối xuất báo cáo ra tệp phải mang đúng tên chức năng. */
@ExtendWith(MockitoExtension.class)
class AccessDeniedAuditRecorderReportExportTest {

	@Mock
	private AuditLogService auditLogService;

	@Test
	void labelsDeniedReportExportRequestAsItsOwnFeature() {
		new AccessDeniedAuditRecorder(auditLogService).record("GET", "/api/v1/reports/export");

		verify(auditLogService).record(eq("Từ chối truy cập"), eq(AuditTargetType.GENERAL), isNull(),
				eq("Xuất báo cáo ra tệp"), anyString());
	}
}
