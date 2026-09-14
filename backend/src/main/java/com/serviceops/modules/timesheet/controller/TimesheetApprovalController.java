package com.serviceops.modules.timesheet.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.timesheet.dto.request.TimesheetApproveReq;
import com.serviceops.modules.timesheet.dto.response.PendingTimesheetRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetApprovalRes;
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
 * API duyet bang cham cong (NCL-06-CN-003, Epic NCL-06).
 *
 * <p>Chi Quan ly du an ({@code VT-02}) duoc goi; luat "chi duyet entry thuoc
 * du an minh quan ly" kiem o tang service (TC-02) — PM du yeu nhan
 * {@code 403 FORBIDDEN} khi duyet entry cua du an nguoi khac.</p>
 */
@RestController
@RequiredArgsConstructor
public class TimesheetApprovalController {

	private final TimesheetApprovalService timesheetApprovalService;

	/** Hang cho duyet: cac bang co dong pending thuoc du an cua PM hien tai. */
	@GetMapping("/timesheets/pending")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<PendingTimesheetRes>> findPending() {
		return BaseRes.ok(timesheetApprovalService.findPending());
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
}
