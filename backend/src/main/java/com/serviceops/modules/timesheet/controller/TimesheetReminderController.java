package com.serviceops.modules.timesheet.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.repository.UserRepository;
import com.serviceops.modules.timesheet.dto.response.UnsubmittedTimesheetRes;
import com.serviceops.modules.timesheet.service.TimesheetReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * API tra cuu danh sach chua nop bang cham cong (NCL-06-CN-009, Epic NCL-06).
 *
 * <p>Viec gui nhac thuc su chay tu dong hang tuan qua
 * {@code TimesheetReminderScheduler} — endpoint nay chi phuc vu man hinh xem
 * lai danh sach (PM xem toan bo nhan su cua du an minh phu trach; nhan vien
 * chuyen mon tu kiem tra chinh minh, TC-03).</p>
 */
@RestController
@RequiredArgsConstructor
public class TimesheetReminderController {

	private final TimesheetReminderService timesheetReminderService;
	private final UserRepository userRepository;

	@GetMapping("/timesheets/unsubmitted")
	@PreAuthorize("hasRole('VT-02') or hasRole('VT-03')")
	public BaseRes<List<UnsubmittedTimesheetRes>> findUnsubmitted(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
		LocalDate weekEndDate = weekStartDate.plusDays(6);
		List<Long> userIds = timesheetReminderService.findUnsubmittedUserIds(weekStartDate, weekEndDate);
		Map<Long, String> namesByUserId = userRepository.findAllById(userIds).stream()
				.collect(Collectors.toMap(User::getId, User::getFullName));
		List<UnsubmittedTimesheetRes> result = userIds.stream()
				.map(userId -> new UnsubmittedTimesheetRes(userId, namesByUserId.get(userId), weekStartDate, weekEndDate))
				.toList();
		return BaseRes.ok(result);
	}
}
