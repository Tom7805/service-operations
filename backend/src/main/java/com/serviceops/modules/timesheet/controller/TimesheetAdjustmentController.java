package com.serviceops.modules.timesheet.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.timesheet.dto.request.TimeEntryAdjustmentReq;
import com.serviceops.modules.timesheet.dto.response.AdjustmentTraceRes;
import com.serviceops.modules.timesheet.service.TimesheetAdjustmentService;
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
 * API dieu chinh gio cong da duyet bang but toan dao (NCL-06-CN-005, Epic NCL-06).
 *
 * <p>Chi Quan ly du an ({@code VT-02}) duoc goi; nhan vien chuyen mon (VT-03) bi tu choi
 * {@code 403 FORBIDDEN} tu tang phan quyen — dong y het voi viec ho khong the tu sua/xoa
 * truc tiep dong gio cong da duyet cua chinh minh qua API cua NCL-06-CN-001 (TC-02). Luat
 * "chi dieu chinh entry thuoc du an minh quan ly" kiem o tang service.</p>
 */
@RestController
@RequestMapping("/projects/{projectId}/tasks/{taskId}")
@RequiredArgsConstructor
public class TimesheetAdjustmentController {

	private final TimesheetAdjustmentService timesheetAdjustmentService;

	/** TC-01/TC-02/TC-03: dieu chinh mot dong gio cong da duyet bang but toan dao. */
	@PostMapping("/time-entries/{entryId}/reversal")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<AdjustmentTraceRes> adjust(@PathVariable Long projectId, @PathVariable Long taskId,
			@PathVariable Long entryId, @Valid @RequestBody TimeEntryAdjustmentReq request) {
		return BaseRes.ok("Dieu chinh gio cong thanh cong",
				timesheetAdjustmentService.adjust(projectId, taskId, entryId, request));
	}

	/** Lich su dieu chinh cua mot cong viec — moi nhat truoc ("tra cuu duoc" — TC-01, Ket qua). */
	@GetMapping("/adjustments")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<List<AdjustmentTraceRes>> history(@PathVariable Long projectId, @PathVariable Long taskId) {
		return BaseRes.ok(timesheetAdjustmentService.findHistory(projectId, taskId));
	}
}
