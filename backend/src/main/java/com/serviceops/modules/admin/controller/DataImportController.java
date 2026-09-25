package com.serviceops.modules.admin.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.dto.request.ImportCommitReq;
import com.serviceops.modules.admin.dto.response.ImportPreviewRes;
import com.serviceops.modules.admin.dto.response.ImportResultRes;
import com.serviceops.modules.admin.enums.ImportTargetType;
import com.serviceops.modules.admin.service.DataImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

/**
 * NCL-15-CN-004 — chi Quan tri vien (VT-07) nhap du lieu tu tep. Vai tro khac nhan 403 va
 * {@code AccessDeniedAuditRecorder} ghi "Tu choi truy cap — Nhập dữ liệu từ tệp" (TC-04).
 */
@RestController
@RequestMapping("/imports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class DataImportController {

	static final long MAX_FILE_BYTES = 2L * 1024 * 1024;

	private final DataImportService dataImportService;

	/** Tai tep mau CSV (co mot dong du lieu mo phong). */
	@GetMapping("/templates/{targetType}")
	public ResponseEntity<byte[]> template(@PathVariable ImportTargetType targetType) {
		String fileName = "mau-nhap-" + targetType.name().toLowerCase(Locale.ROOT) + ".csv";
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
				.contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
				.body(dataImportService.template(targetType));
	}

	/** Buoc 1 — xem truoc (multipart: {@code file}, {@code targetType}). */
	@PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public BaseRes<ImportPreviewRes> preview(@RequestParam ImportTargetType targetType,
			@RequestPart("file") MultipartFile file) throws IOException {
		if (file.isEmpty()) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Tep tai len rong");
		}
		if (file.getSize() > MAX_FILE_BYTES) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, "Tep vuot qua dung luong toi da 2 MB");
		}
		String name = file.getOriginalFilename();
		if (name != null && !name.toLowerCase(Locale.ROOT).endsWith(".csv") && !name.toLowerCase(Locale.ROOT).endsWith(".txt")) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Chi nhan tep CSV (.csv). Tu Excel chon Luu thanh > CSV UTF-8 (Comma delimited)");
		}
		return BaseRes.ok(dataImportService.preview(targetType, name, file.getBytes()));
	}

	/** Buoc 2 — xac nhan nhap (TC-01, TC-03). */
	@PostMapping("/{jobId}/commit")
	public BaseRes<ImportResultRes> commit(@PathVariable Long jobId,
			@Valid @RequestBody(required = false) ImportCommitReq request) {
		return BaseRes.ok("Da nhap du lieu", dataImportService.commit(jobId, request));
	}

	@GetMapping
	public BaseRes<List<ImportResultRes>> list() {
		return BaseRes.ok(dataImportService.list());
	}

	@GetMapping("/{jobId}")
	public BaseRes<ImportResultRes> get(@PathVariable Long jobId) {
		return BaseRes.ok(dataImportService.get(jobId));
	}
}
