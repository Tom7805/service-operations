package com.serviceops.modules.timesheet.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.timesheet.dto.request.TimesheetSubmitReq;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;
import com.serviceops.modules.timesheet.service.TimesheetSubmitService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * API nop bang cham cong tuan (NCL-06-CN-002, Epic NCL-06).
 *
 * <p>Chi Nhan vien chuyen mon ({@code VT-03}) duoc goi (TC-04) va chi nop
 * bang cua chinh minh; cac rang buoc nghiep vu (du dong gio nhap, QTN-14
 * 12 gio/ngay, khong nop lai) kiem o tang service.</p>
 */
@RestController
@RequiredArgsConstructor
public class TimesheetController {

	private final TimesheetSubmitService timesheetSubmitService;

	/**
	 * Nop bang cham cong cua chinh minh cho tuan bat dau tu {@code weekStartDate}
	 * (7 ngay lien ke). Tuong duong voi khoang weekFrom/weekTo tren luoi gio cong
	 * {@code GET /me/time-entries}.
	 */
	@PostMapping("/me/timesheets/{weekStartDate}/submit")
	@PreAuthorize("hasRole('VT-03')")
	public BaseRes<TimesheetRes> submitWeek(
			@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate,
			@RequestBody(required = false) TimesheetSubmitReq request) {
		return BaseRes.ok("Nop bang cham cong tuan thanh cong",
				timesheetSubmitService.submit(weekStartDate, weekStartDate.plusDays(6)));
	}
}
