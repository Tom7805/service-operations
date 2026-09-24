package com.serviceops.modules.report.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.SensitiveAccessLogger;
import com.serviceops.common.audit.enums.SensitiveDataType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.common.masking.DataMaskingService;
import com.serviceops.modules.contract.enums.ContractType;
import com.serviceops.modules.project.enums.ProjectStatus;
import com.serviceops.modules.report.dto.request.ReportExportReq;
import com.serviceops.modules.report.dto.response.ProjectPerformanceRes;
import com.serviceops.modules.report.dto.response.ReportFileRes;
import com.serviceops.modules.report.service.ProjectPerformanceReportService;
import com.serviceops.modules.report.service.ReportExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * NCL-11-CN-004 — Xuất báo cáo ra tệp.
 *
 * <p>Tệp là bảng tính CSV: dòng đầu là tiêu đề cột tiếng Việt, mỗi dòng sau là một dự án; mã hóa UTF-8 có BOM để Excel
 * mở đúng dấu tiếng Việt. Số liệu lấy từ cùng nguồn với màn hình báo cáo nên tệp khớp với những gì người dùng thấy.</p>
 *
 * <p><b>Che dữ liệu (QTN-02, NCL-01-CN-005-TC-02):</b> với người không được xem dữ liệu nhạy cảm, các cột giá vốn bị
 * <i>bỏ hẳn</i> khỏi tệp (không chỉ thay bằng "***") để tệp chuyển tiếp ra ngoài không để lộ cả tên cột.</p>
 *
 * <p><b>Nhật ký (TC-04, QTN-03):</b> Nhật ký hệ thống và Nhật ký truy cập dữ liệu nhạy cảm loại EXPORT ghi cùng
 * transaction; không ghi được thì không trả tệp.</p>
 */
@Service
@RequiredArgsConstructor
public class ReportExportServiceImpl implements ReportExportService {

	static final String FEATURE_LABEL = "Xuất báo cáo ra tệp";
	private static final String BOM = "﻿";
	private static final String NEWLINE = "\r\n";

	private final ProjectPerformanceReportService projectPerformanceReportService;
	private final DataMaskingService dataMaskingService;
	private final AuditLogService auditLogService;
	private final SensitiveAccessLogger sensitiveAccessLogger;

	@Override
	@Transactional
	public ReportFileRes export(ReportExportReq request) {
		boolean includeCost = dataMaskingService.canViewSensitiveData();

		Table table = switch (request.reportType()) {
			case PROJECT_PERFORMANCE -> projectPerformanceTable(
					projectPerformanceReportService.getRowsForPeriod(request.from(), request.to()), includeCost);
		};

		// TC-02: kỳ không có số liệu -> báo không có dữ liệu để xuất, không trả tệp rỗng.
		if (table.rowCount() == 0) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Khong co du lieu de xuat trong ky " + request.from() + " den " + request.to());
		}

		String fileName = request.reportType().getFileSlug() + "_" + request.from() + "_" + request.to() + "."
				+ request.format().getExtension();
		byte[] content = (BOM + table.csv()).getBytes(StandardCharsets.UTF_8);

		String detail = "Xuất " + request.reportType().getLabel() + " kỳ " + request.from() + " đến " + request.to()
				+ " (" + table.rowCount() + " dòng, định dạng " + request.format()
				+ (includeCost ? ", gồm cột giá vốn" : ", đã bỏ cột giá vốn") + ") ra tệp " + fileName;
		auditLogService.record("Xuất báo cáo", AuditTargetType.GENERAL, null, FEATURE_LABEL, detail);
		sensitiveAccessLogger.logExport(SensitiveDataType.MARGIN, null, request.reportType().name(), detail);

		return new ReportFileRes(fileName, request.format().getContentType(), content, table.rowCount());
	}

	private static Table projectPerformanceTable(List<ProjectPerformanceRes> rows, boolean includeCost) {
		List<Column<ProjectPerformanceRes>> columns = new ArrayList<>(List.of(
				column("Mã dự án", ProjectPerformanceRes::projectCode),
				column("Tên dự án", ProjectPerformanceRes::projectName),
				column("Trạng thái", row -> statusLabel(row.status())),
				column("Mã hợp đồng", ProjectPerformanceRes::contractCode),
				column("Loại hợp đồng", row -> contractTypeLabel(row.contractType())),
				column("Có kế hoạch", row -> row.planAvailable() ? "Có" : "Không"),
				column("Giờ dự kiến", ProjectPerformanceRes::plannedHours),
				column("Giờ thực tế", ProjectPerformanceRes::actualHours),
				column("Chênh lệch giờ", ProjectPerformanceRes::hoursVariance),
				column("Chênh lệch giờ (%)", ProjectPerformanceRes::hoursVariancePercent),
				column("Giá trị hợp đồng", ProjectPerformanceRes::contractValue),
				column("Doanh thu ghi nhận", ProjectPerformanceRes::recognizedRevenue),
				column("Doanh thu / giá trị hợp đồng (%)", ProjectPerformanceRes::revenueToContractPercent),
				column("Doanh thu dự kiến", ProjectPerformanceRes::plannedRevenue)));
		if (includeCost) {
			columns.add(column("Giá vốn dự kiến", ProjectPerformanceRes::plannedCost));
			columns.add(column("Giá vốn thực tế", ProjectPerformanceRes::actualCost));
		}
		columns.addAll(List.of(
				column("Biên dự kiến (%)", ProjectPerformanceRes::plannedMarginPercent),
				column("Biên thực tế (%)", ProjectPerformanceRes::actualMarginPercent),
				column("Chênh lệch biên (điểm %)", ProjectPerformanceRes::marginGapPercentPoints)));
		if (includeCost) {
			columns.add(column("Chi phí do chênh lệch giờ", ProjectPerformanceRes::hoursVarianceCostImpact));
		}
		columns.addAll(List.of(
				column("Ảnh hưởng biên do chênh lệch giờ (điểm %)",
						ProjectPerformanceRes::hoursVarianceMarginImpactPercentPoints),
				column("Cảnh báo", row -> String.join(" | ", row.warnings()))));

		StringBuilder csv = new StringBuilder();
		appendLine(csv, columns.stream().map(Column::header).toList());
		for (ProjectPerformanceRes row : rows) {
			appendLine(csv, columns.stream().map(col -> col.value().apply(row)).toList());
		}
		return new Table(csv.toString(), rows.size());
	}

	private static void appendLine(StringBuilder csv, List<?> cells) {
		for (int i = 0; i < cells.size(); i++) {
			if (i > 0) {
				csv.append(',');
			}
			csv.append(cell(cells.get(i)));
		}
		csv.append(NEWLINE);
	}

	/**
	 * Một ô CSV theo RFC 4180. Số in dạng thập phân thuần ({@code 1500000.00}, không ký hiệu mũ). Chuỗi bắt đầu bằng
	 * {@code = + - @} bị thêm dấu nháy đơn phía trước để bảng tính không hiểu nhầm thành công thức (chống CSV injection).
	 */
	static String cell(Object value) {
		if (value == null) {
			return "";
		}
		if (value instanceof BigDecimal number) {
			return number.toPlainString();
		}
		String text = value.toString();
		if (!text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0) {
			text = "'" + text;
		}
		if (text.contains(",") || text.contains("\"") || text.contains("\n") || text.contains("\r")) {
			text = "\"" + text.replace("\"", "\"\"") + "\"";
		}
		return text;
	}

	private static String statusLabel(ProjectStatus status) {
		if (status == null) {
			return "";
		}
		return switch (status) {
			case RUNNING -> "Đang chạy";
			case CLOSED -> "Đã đóng";
		};
	}

	private static String contractTypeLabel(ContractType type) {
		if (type == null) {
			return "";
		}
		return switch (type) {
			case TIME_AND_MATERIAL -> "Theo giờ";
			case FIXED_PRICE -> "Trọn gói";
			case MAINTENANCE -> "Duy trì";
			case MILESTONE -> "Theo mốc";
		};
	}

	private static <T> Column<T> column(String header, Function<T, Object> value) {
		return new Column<>(header, value);
	}

	private record Column<T>(String header, Function<T, Object> value) {
	}

	private record Table(String csv, int rowCount) {
	}
}
