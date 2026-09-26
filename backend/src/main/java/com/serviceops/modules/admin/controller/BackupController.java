package com.serviceops.modules.admin.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.admin.dto.request.BackupCreateReq;
import com.serviceops.modules.admin.dto.request.RestoreConfirmReq;
import com.serviceops.modules.admin.dto.response.BackupRecordRes;
import com.serviceops.modules.admin.dto.response.RestoreChallengeRes;
import com.serviceops.modules.admin.dto.response.RestoreResultRes;
import com.serviceops.modules.admin.enums.BackupStatus;
import com.serviceops.modules.admin.enums.BackupTrigger;
import com.serviceops.modules.admin.service.BackupService;
import com.serviceops.modules.admin.service.RestoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * NCL-15-CN-003 — sao luu va phuc hoi du lieu. Chi Quan tri vien (VT-07, QTN-30); vai tro khac nhan 403 va
 * {@code AccessDeniedAuditRecorder} ghi "Tu choi truy cap — Sao lưu và phục hồi dữ liệu" (TC-03).
 */
@RestController
@RequestMapping("/backups")
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class BackupController {

	private final BackupService backupService;
	private final RestoreService restoreService;

	@GetMapping
	public BaseRes<List<BackupRecordRes>> list() {
		return BaseRes.ok(backupService.list());
	}

	@GetMapping("/{backupId}")
	public BaseRes<BackupRecordRes> get(@PathVariable Long backupId) {
		return BaseRes.ok(backupService.get(backupId));
	}

	/** TC-01: tao ban sao luu theo yeu cau. Loi giua chung van tra 200 kem ban ghi {@code FAILED}. */
	@PostMapping
	public BaseRes<BackupRecordRes> create(@Valid @RequestBody(required = false) BackupCreateReq request) {
		BackupRecordRes result = backupService.create(request == null ? null : request.note(), BackupTrigger.MANUAL);
		return BaseRes.ok(result.status() == BackupStatus.COMPLETED ? "Tao ban sao luu thanh cong"
				: "Tao ban sao luu that bai", result);
	}

	/** QTN-30 buoc 1 (TC-02: ban sao loi / do dang -> 400 INVALID_STATE). */
	@PostMapping("/{backupId}/restore-requests")
	public BaseRes<RestoreChallengeRes> requestRestore(@PathVariable Long backupId) {
		return BaseRes.ok("Da tao yeu cau phuc hoi, vui long xac nhan buoc 2", restoreService.requestRestore(backupId));
	}

	/** QTN-30 buoc 2: gui lai ma xac nhan + mat khau. */
	@PostMapping("/restore-requests/{requestId}/confirm")
	public BaseRes<RestoreResultRes> confirmRestore(@PathVariable Long requestId,
			@Valid @RequestBody RestoreConfirmReq request) {
		return BaseRes.ok("Phuc hoi du lieu thanh cong", restoreService.confirmRestore(requestId, request));
	}
}
