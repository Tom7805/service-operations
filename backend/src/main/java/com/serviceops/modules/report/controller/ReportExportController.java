package com.serviceops.modules.report.controller;

import com.serviceops.modules.report.dto.request.ReportExportReq;
import com.serviceops.modules.report.dto.response.ReportFileRes;
import com.serviceops.modules.report.enums.ReportFormat;
import com.serviceops.modules.report.enums.ReportType;
import com.serviceops.modules.report.service.ReportExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

/**
 * NCL-11-CN-004 — Xuất báo cáo ra tệp.
 *
 * <p>Chỉ Quản lý dự án (VT-02) được xuất (TC-03). {@code @PreAuthorize} chặn trước khi vào method nên mọi vai trò
 * khác đều nhận 403, và {@code GlobalExceptionHandler} cùng {@code AccessDeniedAuditRecorder} tự ghi nhật ký lần
 * từ chối. Thành công trả thẳng nội dung tệp (không bọc {@code BaseRes}); lỗi vẫn trả JSON lỗi chuẩn.</p>
 */
@RestController
@RequestMapping("/reports/export")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-02')")
public class ReportExportController {

	private final ReportExportService reportExportService;

	/** TC-01/TC-02/TC-04: xuất báo cáo của kỳ đã chọn thành tệp tải về. */
	@GetMapping
	public ResponseEntity<byte[]> export(
			@RequestParam ReportType reportType,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			@RequestParam(required = false) ReportFormat format) {
		ReportFileRes file = reportExportService.export(new ReportExportReq(reportType, from, to, format));

		ContentDisposition disposition = ContentDisposition.attachment()
				.filename(file.fileName(), StandardCharsets.UTF_8)
				.build();
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
				.header("X-Report-Row-Count", String.valueOf(file.rowCount()))
				.contentType(MediaType.parseMediaType(file.contentType()))
				.contentLength(file.content().length)
				.body(file.content());
	}
}
