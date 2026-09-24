package com.serviceops.common.audit;

import com.serviceops.common.audit.service.AuditLogService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

/**
 * Ban ghi "Tu choi truy cap" cua Epic NCL-12 phai mang dung ten chuc nang (TC-03 cua 4 story): cac duong
 * dan nghiem thu chua chuoi con cua chuc nang khac ("/reject" cua bang cham cong, "/contracts" cua tao du
 * an, "/milestones"...) nen khong duoc bi nhan nham.
 */
@ExtendWith(MockitoExtension.class)
class AccessDeniedAuditRecorderAcceptanceTest {

	@Mock
	private AuditLogService auditLogService;

	@ParameterizedTest
	@CsvSource({
			"POST, /api/v1/projects/1/acceptances, Lập phiếu nghiệm thu hạng mục",
			"GET, /api/v1/projects/1/work-packages/2/acceptance-readiness, Lập phiếu nghiệm thu hạng mục",
			"PUT, /api/v1/acceptances/5, Lập phiếu nghiệm thu hạng mục",
			"POST, /api/v1/acceptances/5/confirm, Xác nhận phiếu nghiệm thu",
			"POST, /api/v1/acceptances/5/reject, Xác nhận phiếu nghiệm thu",
			"PUT, /api/v1/acceptances/5/payment-milestone, Gắn phiếu nghiệm thu với mốc thanh toán",
			"GET, /api/v1/contracts/3/milestone-acceptances, Gắn phiếu nghiệm thu với mốc thanh toán",
			"POST, /api/v1/deliverables/9/versions, Quản lý sản phẩm bàn giao",
			"GET, /api/v1/projects/1/deliverables, Quản lý sản phẩm bàn giao"
	})
	void labelsAcceptanceFeatures(String method, String uri, String label) {
		new AccessDeniedAuditRecorder(auditLogService).record(method, uri);

		verify(auditLogService).record(eq("Từ chối truy cập"), eq(AuditTargetType.ACCEPTANCE), isNull(),
				eq(label), anyString());
	}

	@ParameterizedTest
	@CsvSource({
			"POST, /api/v1/timesheets/5/reject, Từ chối bảng chấm công",
			"PUT, /api/v1/contracts/5/milestones, Quản lý mốc thanh toán của hợp đồng"
	})
	void doesNotStealOtherFeatures(String method, String uri, String label) {
		new AccessDeniedAuditRecorder(auditLogService).record(method, uri);

		verify(auditLogService).record(eq("Từ chối truy cập"), org.mockito.ArgumentMatchers.any(), isNull(),
				eq(label), anyString());
	}
}
