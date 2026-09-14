package com.serviceops.modules.timesheet.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.timesheet.dto.request.TimesheetRejectReq;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;
import com.serviceops.modules.timesheet.service.TimesheetApprovalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * NCL-06-CN-004: tu choi bang cham cong.
 *
 * <p>Chi Quan ly du an (VT-02) duoc thao tac (TC-03). Vai tro khac bi tu choi 403 va bi ghi nhat ky
 * lan tu choi boi {@code AccessDeniedAuditRecorder}.</p>
 */
@RestController
@RequestMapping("/timesheets")
@RequiredArgsConstructor
public class TimesheetApprovalController {

	private final TimesheetApprovalService timesheetApprovalService;

	/** TC-01/TC-02: tu choi bang cham cong dang cho duyet, bat buoc kem ly do. */
	@PutMapping("/{timesheetId}/reject")
	@PreAuthorize("hasRole('VT-02')")
	public BaseRes<TimesheetRes> reject(@PathVariable Long timesheetId,
			@Valid @RequestBody TimesheetRejectReq request) {
		return BaseRes.ok("Tu choi bang cham cong thanh cong",
				timesheetApprovalService.reject(timesheetId, request));
	}
}
