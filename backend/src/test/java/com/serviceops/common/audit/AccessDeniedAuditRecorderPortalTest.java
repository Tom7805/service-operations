package com.serviceops.common.audit;

import com.serviceops.common.audit.service.AuditLogService;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

/**
 * Ban ghi "Tu choi truy cap" cua Epic NCL-13 phai mang dung ten chuc nang cong khach hang: duong dan cong chua
 * chuoi con cua chuc nang noi bo ("/acceptances/{id}/confirm", "/invoices", "/projects"...) nen khong duoc
 * bi nhan nham, va nguoc lai chuc nang noi bo khong bi quy tac cong "cuop" nhan.
 */
@ExtendWith(MockitoExtension.class)
class AccessDeniedAuditRecorderPortalTest {

	@Mock
	private AuditLogService auditLogService;

	@ParameterizedTest
	@CsvSource({
			"POST, /api/v1/portal-accounts, Cấp tài khoản cổng khách hàng",
			"PATCH, /api/v1/portal-accounts/5/status, Cấp tài khoản cổng khách hàng",
			"GET, /api/v1/portal/projects, Cổng theo dõi dự án",
			"GET, /api/v1/portal/projects/12, Cổng theo dõi dự án",
			"POST, /api/v1/portal/acceptances/5/confirm, Duyệt phiếu nghiệm thu trên cổng",
			"POST, /api/v1/portal/acceptances/5/reject, Duyệt phiếu nghiệm thu trên cổng",
			"GET, /api/v1/portal/invoices/9, Xem hóa đơn và công nợ trên cổng",
			"GET, /api/v1/portal/invoices/summary, Xem hóa đơn và công nợ trên cổng"
	})
	void labelsPortalFeatures(String method, String uri, String label) {
		new AccessDeniedAuditRecorder(auditLogService).record(method, uri);

		verify(auditLogService).record(eq("Từ chối truy cập"), eq(AuditTargetType.PORTAL), isNull(),
				eq(label), anyString());
	}

	@ParameterizedTest
	@CsvSource({
			"POST, /api/v1/acceptances/5/confirm, Xác nhận phiếu nghiệm thu",
			"GET, /api/v1/invoices, Tra cứu hóa đơn và công nợ",
			"GET, /api/v1/customers/1, Hồ sơ khách hàng"
	})
	void doesNotStealInternalFeatures(String method, String uri, String label) {
		new AccessDeniedAuditRecorder(auditLogService).record(method, uri);

		verify(auditLogService).record(eq("Từ chối truy cập"), any(), isNull(), eq(label), anyString());
	}
}
