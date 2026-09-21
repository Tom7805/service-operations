package com.serviceops.common.audit;

import com.serviceops.common.audit.service.AuditLogService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;

/**
 * Ban ghi "Tu choi truy cap" cua hai chuc nang hoa don (Epic NCL-10) phai mang dung ten chuc nang: duong dan
 * {@code /invoice-proposals} (NCL-10-CN-001) cung chua chuoi {@code /invoice} cua lap hoa don theo moc
 * (NCL-10-CN-002) nen khong duoc bi nhan nham thanh chuc nang thu hai.
 */
@ExtendWith(MockitoExtension.class)
class AccessDeniedAuditRecorderInvoiceTest {

	@Mock
	private AuditLogService auditLogService;

	@Test
	void labelsDeniedInvoiceProposalRequestAsItsOwnFeature() {
		new AccessDeniedAuditRecorder(auditLogService).record("POST", "/api/v1/projects/1/invoice-proposals");

		ArgumentCaptor<String> detail = ArgumentCaptor.forClass(String.class);
		verify(auditLogService).record(eq("Từ chối truy cập"), eq(AuditTargetType.INVOICE), isNull(),
				eq("Tạo đề nghị xuất hóa đơn từ giờ công"), detail.capture());
		assertThat(detail.getValue()).contains("Tạo đề nghị xuất hóa đơn từ giờ công");
	}

	@Test
	void stillLabelsDeniedMilestoneInvoiceAsMilestoneFeature() {
		new AccessDeniedAuditRecorder(auditLogService).record("POST", "/api/v1/contracts/5/milestones/7/invoice");

		verify(auditLogService).record(eq("Từ chối truy cập"), eq(AuditTargetType.INVOICE), isNull(),
				eq("Lập hóa đơn theo mốc hợp đồng"), org.mockito.ArgumentMatchers.anyString());
	}
}
