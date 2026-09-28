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

/** Lần từ chối vào lịch ngày nghỉ lễ phải mang đúng tên chức năng. */
@ExtendWith(MockitoExtension.class)
class AccessDeniedAuditRecorderHolidayTest {

	@Mock
	private AuditLogService auditLogService;

	@Test
	void labelsDeniedHolidayCalendarRequestAsItsOwnFeature() {
		new AccessDeniedAuditRecorder(auditLogService).record("POST", "/api/v1/holidays");

		verify(auditLogService).record(eq("Từ chối truy cập"), eq(AuditTargetType.GENERAL), isNull(),
				eq("Lịch ngày nghỉ lễ"), anyString());
	}
}
