package com.serviceops.modules.timesheet.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.timesheet.dto.response.TimesheetRes;
import com.serviceops.modules.timesheet.entity.TimeEntry;
import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.enums.TimeEntryStatus;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.mapper.TimesheetMapper;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.repository.TimesheetRepository;
import com.serviceops.modules.timesheet.service.TimesheetSubmitService;
import com.serviceops.modules.timesheet.validator.DailyHourLimitValidator;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TimesheetSubmitServiceImpl implements TimesheetSubmitService {

	private static final String TIMESHEET_LABEL = "Bang cham cong tuan";

	private final TimeEntryRepository timeEntryRepository;
	private final TimesheetRepository timesheetRepository;
	private final CurrentUserScopeProvider currentUserScopeProvider;
	private final AuditLogService auditLogService;
	private final TimesheetMapper timesheetMapper;
	private final Clock clock;

	@Override
	public TimesheetRes submit(LocalDate weekFrom, LocalDate weekTo) {
		Long userId = requireCurrentUser();
		validateWeekRange(weekFrom, weekTo);

		List<TimeEntry> entries = timeEntryRepository
				.findByUserIdAndWorkDateBetweenOrderByIdAsc(userId, weekFrom, weekTo);
		if (entries.isEmpty()) {
			throw invalidState("Tuan cham cong tu " + weekFrom + " den " + weekTo
					+ " chua co dong gio cong nao de nop");
		}
		List<TimeEntry> draftEntries = entries.stream()
				.filter(entry -> entry.getStatus() == TimeEntryStatus.DRAFT)
				.toList();
		if (draftEntries.isEmpty()) {
			throw invalidState("Khong con dong gio cong nhap (DRAFT) nao trong tuan de nop");
		}

		// TC-03: bang da nop tu truoc (cho duyet hoac da duyet) thi khong nop lai;
		// bang bi tu choi (REJECTED) cho nop lai — cap nhat lai ban ghi cu.
		Timesheet timesheet = timesheetRepository.findByUserIdAndWeekStartDate(userId, weekFrom).orElse(null);
		if (timesheet != null && timesheet.getStatus() != TimesheetStatus.REJECTED) {
			throw invalidState("Bang cham cong tuan bat dau " + weekFrom + " da duoc nop tu truoc ("
					+ timesheet.getStatus() + "), khong the nop lai");
		}

		// TC-02 / QTN-14: chan nop khi ton tai ngay co tong gio vuot 12 — bao ro tung ngay vi pham.
		String overLimitDays = timesheetRepository.sumHoursPerDayBetween(userId, weekFrom, weekTo).stream()
				.filter(day -> ((BigDecimal) day[1]).compareTo(DailyHourLimitValidator.MAX_HOURS_PER_DAY) > 0)
				.map(day -> day[0] + " (" + day[1] + " gio)")
				.collect(Collectors.joining(", "));
		if (!overLimitDays.isEmpty()) {
			throw invalidState("Khong the nop bang cham cong: vuot gioi han " + DailyHourLimitValidator
					.MAX_HOURS_PER_DAY + " gio/ngay (QTN-14) tai ngay: " + overLimitDays);
		}

		return saveSubmission(userId, weekFrom, weekTo, entries, draftEntries, timesheet);
	}

	private TimesheetRes saveSubmission(Long userId, LocalDate weekFrom, LocalDate weekTo,
			List<TimeEntry> entries, List<TimeEntry> draftEntries, Timesheet existing) {
		// Ket qua sau khi nop: dong DRAFT chuyen SUBMITTED — nhan su khong sua duoc nua
		// (ImmutableEntryValidator chan sua/xoa, TC-03).
		draftEntries.forEach(entry -> entry.setStatus(TimeEntryStatus.SUBMITTED));
		timeEntryRepository.saveAll(draftEntries);

		LocalDateTime now = LocalDateTime.now(clock);
		Timesheet timesheet = existing == null ? new Timesheet() : existing;
		if (existing == null) {
			timesheet.setUserId(userId);
			timesheet.setWeekStartDate(weekFrom);
			timesheet.setWeekEndDate(weekTo);
			timesheet.setCreatedAt(now);
		}
		timesheet.setStatus(TimesheetStatus.PENDING_APPROVAL);
		timesheet.setTotalHours(entries.stream().map(TimeEntry::getHours)
				.reduce(BigDecimal.ZERO, BigDecimal::add));
		timesheet.setSubmittedBy(currentUsername());
		timesheet.setSubmittedAt(now);
		timesheet.setUpdatedAt(now);
		Timesheet saved = timesheetRepository.save(timesheet);

		// TC-05: ghi nhat ky nguoi thuc hien, noi dung, thoi diem (actor tu SecurityContextHolder).
		auditLogService.record("Nop bang cham cong tuan", AuditTargetType.GENERAL, saved.getId(),
				TIMESHEET_LABEL, "Tuan " + weekFrom + " - " + weekTo + ": " + saved.getTotalHours()
						+ " gio, " + draftEntries.size() + " dong chuyen cho duyet");

		// Hook thong bao nguoi duyet (TC-01): thong bao in-app cho PM cua cac du an trong tuan se duoc
		// gui tai day khi module notification di vao hoat dong (NotificationType TIMESHEET_SUBMITTED).
		// Hien tai nguoi duyet nhin thay bang qua hang cho duyet (Timesheet PENDING_APPROVAL).

		return timesheetMapper.toResponse(saved);
	}

	private void validateWeekRange(LocalDate weekFrom, LocalDate weekTo) {
		if (weekTo.isBefore(weekFrom)) {
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR,
					"Ngay ket thuc tuan cham cong khong duoc som hon ngay bat dau");
		}
	}

	private Long requireCurrentUser() {
		Long userId = currentUserScopeProvider.currentUserId();
		if (userId == null) {
			throw new AccessDeniedException("Chua xac thuc nguoi dung");
		}
		return userId;
	}

	private BusinessRuleException invalidState(String message) {
		return new BusinessRuleException(ErrorCode.INVALID_STATE, message);
	}

	private String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}
}
