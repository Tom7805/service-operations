package com.serviceops.modules.timesheet.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.timesheet.dto.request.TimesheetApproveReq;
import com.serviceops.modules.timesheet.dto.request.TimesheetRejectReq;
import com.serviceops.modules.timesheet.dto.response.AdjustableEntryRes;
import com.serviceops.modules.timesheet.dto.response.PendingTimesheetRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetApprovalRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetRejectRes;
import com.serviceops.modules.timesheet.service.TimesheetAdjustmentService;
import com.serviceops.modules.timesheet.service.TimesheetApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API duyet / tu choi bang cham cong (NCL-06-CN-003, NCL-06-CN-004, Epic NCL-06).
 *
 * <p>Chi Quan ly du an ({@code VT-02}) duoc goi; luat "chi duyet/tu choi entry thuoc
 * du an minh quan ly" kiem o tang service (TC-02) — PM du yeu nhan
 * {@code 403 FORBIDDEN} khi thao tac tren entry cua du an nguoi khac. Vai tro khac
 * bi tu choi 403 va bi ghi nhat ky lan tu choi boi {@code AccessDeniedAuditRecorder}
 * (NCL-06-CN-004-TC-03).</p>
 */
@RestController
@RequiredArgsConstructor
public class TimesheetApprovalController {

	private final TimesheetApprovalService timesheetApprovalService;
	private final TimesheetAdjustmentService timesheetAdjustmentService;

	/** Hang cho duyet: cac bang co dong pending thuoc du an cua PM hien tai. */
	@GetMapping("/timesheets/pending")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<PendingTimesheetRes>> findPending() {
		return BaseRes.ok(timesheetApprovalService.findPending());
	}

	/**
	 * NCL-06-CN-005: danh sach dong gio cong DA DUYET con dieu chinh duoc (dong goc, chua
	 * tung dieu chinh) thuoc cac du an cua PM hien tai — de PM chon truc tiep tren man hinh
	 * "Dieu chinh gio cong da duyet" thay vi phai tu biet truoc Project ID/Task ID/Entry ID.
	 */
	@GetMapping("/timesheets/adjustable-entries")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<AdjustableEntryRes>> findAdjustableEntries() {
		return BaseRes.ok(timesheetAdjustmentService.findAdjustableEntries());
	}

	/** Duyet nguyen bang (khong truyen entryIds) hoac tung dong (truyen entryIds). */
	@PostMapping("/timesheets/{timesheetId}/approve")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<TimesheetApprovalRes> approve(@PathVariable Long timesheetId,
			@Valid @RequestBody(required = false) TimesheetApproveReq request) {
		TimesheetApprovalRes result = timesheetApprovalService.approve(timesheetId, request);
		String message = result.overBudgetWarnings().isEmpty()
				? "Duyet bang cham cong thanh cong"
				: "Duyet bang cham cong thanh cong — canh bao: "
						+ String.join("; ", result.overBudgetWarnings());
		return BaseRes.ok(message, result);
	}

	/**
	 * NCL-06-CN-004: tu choi nguyen bang (khong truyen entryIds) hoac tung dong (truyen
	 * entryIds), bat buoc kem ly do. Dong bi tu choi quay ve nhap (DRAFT) de nguoi nop sua lai.
	 */
	@PostMapping("/timesheets/{timesheetId}/reject")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<TimesheetRejectRes> reject(@PathVariable Long timesheetId,
			@Valid @RequestBody TimesheetRejectReq request) {
		return BaseRes.ok("Tu choi bang cham cong thanh cong",
				timesheetApprovalService.reject(timesheetId, request));
	}
}
