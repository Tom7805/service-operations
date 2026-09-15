package com.serviceops.modules.timesheet.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.timesheet.dto.request.PeriodLockReq;
import com.serviceops.modules.timesheet.dto.response.TimesheetPeriodRes;
import com.serviceops.modules.timesheet.service.TimesheetPeriodService;
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
 * API khoa/mo ky cham cong (NCL-06-CN-006, Epic NCL-06).
 *
 * <p>Chi Ke toan ({@code VT-05}) duoc goi; vai tro khac bi tu choi 403 va bi ghi nhat ky lan
 * tu choi boi {@code AccessDeniedAuditRecorder} (TC-03).</p>
 */
@RestController
@RequestMapping("/timesheet-periods")
@RequiredArgsConstructor
public class TimesheetPeriodController {

	private final TimesheetPeriodService timesheetPeriodService;

	/** Danh sach ky cham cong, moi nhat truoc. */
	@GetMapping
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<List<TimesheetPeriodRes>> findAll() {
		return BaseRes.ok(timesheetPeriodService.findAll());
	}

	/** TC-01/TC-02: khoa ky cham cong cua mot thang. */
	@PostMapping("/lock")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<TimesheetPeriodRes> lock(@Valid @RequestBody PeriodLockReq request) {
		return BaseRes.ok("Khoa ky cham cong thanh cong", timesheetPeriodService.lock(request));
	}

	/** Mo lai mot ky da khoa. */
	@PostMapping("/{periodId}/unlock")
	@PreAuthorize("hasRole('VT-05')")
	public BaseRes<TimesheetPeriodRes> unlock(@PathVariable Long periodId) {
		return BaseRes.ok("Mo lai ky cham cong thanh cong", timesheetPeriodService.unlock(periodId));
	}
}
