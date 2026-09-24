package com.serviceops.modules.report;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.common.masking.DataMaskingService;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.profitability.enums.RecognitionMethod;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.report.dto.request.ReportExportReq;
import com.serviceops.modules.report.dto.response.ProjectPerformanceRes;
import com.serviceops.modules.report.dto.response.ReportFileRes;
import com.serviceops.modules.report.enums.ReportFormat;
import com.serviceops.modules.report.enums.ReportType;
import com.serviceops.modules.report.service.ProjectPerformanceReportService;
import com.serviceops.modules.report.service.impl.ReportExportServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** NCL-11-CN-004 — Xuất báo cáo ra tệp. */
@ExtendWith(MockitoExtension.class)
class ReportExportServiceTest {

	private static final LocalDate FROM = LocalDate.of(2026, 7, 1);
	private static final LocalDate TO = LocalDate.of(2026, 9, 30);

	@Mock private ProjectPerformanceReportService projectPerformanceReportService;
	@Mock private DataMaskingService dataMaskingService;
	@Mock private AuditLogService auditLogService;
	@Mock private SensitiveAccessLogger sensitiveAccessLogger;

	@InjectMocks private ReportExportServiceImpl service;

	/** TC-01: tệp có đúng số liệu của kỳ, đúng tên tệp, mã hóa UTF-8 có BOM. */
	@Test
	void exportsSelectedPeriodAsCsv() {
		when(dataMaskingService.canViewSensitiveData()).thenReturn(false);
		when(projectPerformanceReportService.getRowsForPeriod(FROM, TO)).thenReturn(List.of(row()));

		ReportFileRes file = service.export(request());

		assertThat(file.fileName()).isEqualTo("bao-cao-hieu-qua-du-an_2026-07-01_2026-09-30.csv");
		assertThat(file.contentType()).isEqualTo("text/csv; charset=UTF-8");
		assertThat(file.rowCount()).isEqualTo(1);
		assertThat(file.content()).startsWith((byte) 0xEF, (byte) 0xBB, (byte) 0xBF);

		List<String> lines = lines(file);
		assertThat(lines).hasSize(2);
		assertThat(lines.get(0)).startsWith("Mã dự án,Tên dự án,Trạng thái");
		assertThat(lines.get(1)).startsWith("DA-01,\"Trien khai ERP, giai doan 1\",Đang chạy,HD-500,Theo giờ,Có,"
				+ "800.00,950.00,150.00,18.75,200000000.00,95000000.00");
		assertThat(lines.get(1)).endsWith("Giờ công thực tế vượt kế hoạch 150.00 giờ.");
	}

	/** NCL-01-CN-005-TC-02 / QTN-02: Quản lý dự án xuất tệp thì các cột giá vốn không có mặt trong tệp. */
	@Test
	void dropsCostColumnsForRolesWithoutSensitiveAccess() {
		when(dataMaskingService.canViewSensitiveData()).thenReturn(false);
		when(projectPerformanceReportService.getRowsForPeriod(FROM, TO)).thenReturn(List.of(row()));

		String csv = String.join("\n", lines(service.export(request())));

		assertThat(csv).doesNotContain("Giá vốn", "Chi phí do chênh lệch giờ", "60000000.00", "50000000.00",
				"7500000.00", "***");
		assertThat(csv).contains("Biên thực tế (%)", "47.37");
	}

	/** NCL-01-CN-005-TC-03: người được xem dữ liệu nhạy cảm nhận đủ cột giá vốn. */
	@Test
	void keepsCostColumnsForSensitiveRoles() {
		when(dataMaskingService.canViewSensitiveData()).thenReturn(true);
		when(projectPerformanceReportService.getRowsForPeriod(FROM, TO)).thenReturn(List.of(row()));

		List<String> lines = lines(service.export(request()));

		assertThat(lines.get(0)).contains("Giá vốn dự kiến,Giá vốn thực tế", "Chi phí do chênh lệch giờ");
		assertThat(lines.get(1)).contains("60000000.00,50000000.00", "7500000.00");
	}

	/** TC-02: kỳ không có số liệu -> báo không có dữ liệu để xuất, không ghi nhật ký xuất. */
	@Test
	void rejectsPeriodWithoutData() {
		when(projectPerformanceReportService.getRowsForPeriod(FROM, TO)).thenReturn(List.of());

		assertThatThrownBy(() -> service.export(request()))
				.isInstanceOf(BusinessRuleException.class)
				.hasMessageContaining("Khong co du lieu de xuat")
				.satisfies(ex -> assertThat(((BusinessRuleException) ex).getErrorCode())
						.isEqualTo(ErrorCode.INVALID_STATE));

		verifyNoInteractions(auditLogService, sensitiveAccessLogger);
	}

	/** TC-04: mỗi lần xuất ghi Nhật ký hệ thống và Nhật ký truy cập dữ liệu nhạy cảm loại EXPORT. */
	@Test
	void logsEveryExport() {
		when(dataMaskingService.canViewSensitiveData()).thenReturn(false);
		when(projectPerformanceReportService.getRowsForPeriod(FROM, TO)).thenReturn(List.of(row()));

		service.export(request());

		verify(auditLogService).record(eq("Xuất báo cáo"), eq(AuditTargetType.GENERAL), isNull(),
				eq("Xuất báo cáo ra tệp"), contains("2026-07-01 đến 2026-09-30"));
		verify(sensitiveAccessLogger).logExport(eq(SensitiveDataType.MARGIN), isNull(), eq("PROJECT_PERFORMANCE"),
				contains("đã bỏ cột giá vốn"));
		verify(sensitiveAccessLogger, never()).logView(any(), any(), anyString(), anyString());
	}

	@Test
	void validatesRequest() {
		assertThatThrownBy(() -> new ReportExportReq(null, FROM, TO, ReportFormat.CSV))
				.isInstanceOf(BusinessRuleException.class);
		assertThatThrownBy(() -> new ReportExportReq(ReportType.PROJECT_PERFORMANCE, TO, FROM, ReportFormat.CSV))
				.isInstanceOf(BusinessRuleException.class);
		assertThat(new ReportExportReq(ReportType.PROJECT_PERFORMANCE, FROM, TO, null).format())
				.isEqualTo(ReportFormat.CSV);
	}

	/** Ô văn bản bắt đầu bằng ký tự công thức bị vô hiệu hóa (chống CSV injection); số âm vẫn giữ nguyên. */
	@Test
	void neutralisesFormulaCells() {
		ProjectPerformanceRes risky = new ProjectPerformanceRes(2L, "DA-02", "=HYPERLINK(\"x\")",
				ProjectStatus.CLOSED, 3L, 501L, "HD-501", ContractType.FIXED_PRICE, false, null, null,
				null, new BigDecimal("-8.00"), null, null, BigDecimal.ZERO, BigDecimal.ZERO,
				RecognitionMethod.PERCENTAGE_OF_COMPLETION, null, null, null, BigDecimal.ZERO, null, null, null,
				null, null, 0, 0, 0, List.of());
		when(dataMaskingService.canViewSensitiveData()).thenReturn(false);
		when(projectPerformanceReportService.getRowsForPeriod(FROM, TO)).thenReturn(List.of(risky));

		String line = lines(service.export(request())).get(1);

		assertThat(line).startsWith("DA-02,\"'=HYPERLINK(\"\"x\"\")\",Đã đóng,HD-501,Trọn gói,Không,,-8.00,");
	}

	private static ReportExportReq request() {
		return new ReportExportReq(ReportType.PROJECT_PERFORMANCE, FROM, TO, ReportFormat.CSV);
	}

	private static List<String> lines(ReportFileRes file) {
		String text = new String(file.content(), StandardCharsets.UTF_8).substring(1);
		return List.of(text.split("\r\n"));
	}

	private static ProjectPerformanceRes row() {
		return new ProjectPerformanceRes(1L, "DA-01", "Trien khai ERP, giai doan 1", ProjectStatus.RUNNING, 3L, 500L,
				"HD-500", ContractType.TIME_AND_MATERIAL, true, 7L, 2,
				new BigDecimal("800.00"), new BigDecimal("950.00"), new BigDecimal("150.00"), new BigDecimal("18.75"),
				new BigDecimal("200000000.00"), new BigDecimal("95000000.00"), RecognitionMethod.HOURLY,
				new BigDecimal("47.50"),
				new BigDecimal("120000000.00"), new BigDecimal("60000000.00"), new BigDecimal("50000000.00"),
				new BigDecimal("50.00"), new BigDecimal("47.37"), new BigDecimal("-2.63"),
				new BigDecimal("7500000.00"), new BigDecimal("-6.25"),
				0, 0, 0, List.of("Giờ công thực tế vượt kế hoạch 150.00 giờ."));
	}
}
