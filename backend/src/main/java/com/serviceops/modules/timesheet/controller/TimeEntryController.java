package com.serviceops.modules.timesheet.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.timesheet.dto.request.TimeEntryCreateReq;
import com.serviceops.modules.timesheet.dto.request.TimeEntryUpdateReq;
import com.serviceops.modules.timesheet.dto.response.TimeEntryRes;
import com.serviceops.modules.timesheet.dto.response.TimesheetSummaryRes;
import com.serviceops.modules.timesheet.service.TimeEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * API ghi gio cong theo cong viec (NCL-06-CN-001, Epic NCL-06).
 *
 * <p>Chi Nhan vien chuyen mon ({@code VT-03}) duoc goi; luat "chi nguoi dang
 * duoc giao cong viec" kiem o tang service (TC-02) — sai nguoi nhan
 * {@code 403 FORBIDDEN}, sai du lieu nhan {@code 400 VALIDATION_ERROR /
 * DUPLICATE_DATA}, du an da dong nhan {@code 400 INVALID_STATE}.</p>
 */
@RestController
@RequiredArgsConstructor
public class TimeEntryController {

	private final TimeEntryService timeEntryService;

	/** Ghi gio cong cho mot cong viec trong mot ngay. */
	@PostMapping("/projects/{projectId}/tasks/{taskId}/time-entries")
	@PreAuthorize("hasRole('VT-03')")
	public BaseRes<TimeEntryRes> createTimeEntry(@PathVariable Long projectId, @PathVariable Long taskId,
			@Valid @RequestBody TimeEntryCreateReq request) {
		return BaseRes.ok("Ghi gio cong thanh cong", timeEntryService.create(projectId, taskId, request));
	}

	/** Ghi de so gio va ghi chu cua ban ghi DRAFT cua chinh minh. */
	@PutMapping("/projects/{projectId}/tasks/{taskId}/time-entries/{entryId}")
	@PreAuthorize("hasRole('VT-03')")
	public BaseRes<TimeEntryRes> updateTimeEntry(@PathVariable Long projectId, @PathVariable Long taskId,
			@PathVariable Long entryId, @Valid @RequestBody TimeEntryUpdateReq request) {
		return BaseRes.ok("Sua gio cong thanh cong",
				timeEntryService.update(projectId, taskId, entryId, request));
	}

	/** Xoa ban ghi gio cong DRAFT cua chinh minh. */
	@DeleteMapping("/projects/{projectId}/tasks/{taskId}/time-entries/{entryId}")
	@PreAuthorize("hasRole('VT-03')")
	public BaseRes<Void> deleteTimeEntry(@PathVariable Long projectId, @PathVariable Long taskId,
			@PathVariable Long entryId) {
		timeEntryService.delete(projectId, taskId, entryId);
		return BaseRes.ok("Xoa ban ghi gio cong thanh cong", null);
	}

	/** Luoi gio cong tuan cua chinh minh, group theo cong viec, kem canh bao ngan sach (QTN-20). */
	@GetMapping("/me/time-entries")
	@PreAuthorize("hasRole('VT-03')")
	public BaseRes<List<TimesheetSummaryRes>> findMyWeek(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekFrom,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekTo) {
		return BaseRes.ok(timeEntryService.findMyWeek(weekFrom, weekTo));
	}
}
