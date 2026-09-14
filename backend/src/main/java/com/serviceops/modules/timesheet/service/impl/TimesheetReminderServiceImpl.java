package com.serviceops.modules.timesheet.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.repository.NotificationRepository;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.project.entity.Project;
import com.serviceops.modules.project.entity.Task;
import com.serviceops.modules.project.repository.ProjectRepository;
import com.serviceops.modules.project.repository.TaskRepository;
import com.serviceops.modules.timesheet.entity.Timesheet;
import com.serviceops.modules.timesheet.enums.TimesheetStatus;
import com.serviceops.modules.timesheet.repository.TimeEntryRepository;
import com.serviceops.modules.timesheet.repository.TimesheetRepository;
import com.serviceops.modules.timesheet.service.TimesheetReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * NCL-06-CN-009: nhac nop bang cham cong cuoi tuan.
 *
 * <p>"Con o trang thai nhap" o day khong phai mot Timesheet.DRAFT (bang chi
 * duoc tao khi nop, xem {@link Timesheet}) — ma la nhan su co dong
 * {@code TimeEntry} DRAFT trong tuan nhung chua goi API nop tuan
 * ({@code POST /me/timesheets/{weekStartDate}/submit}), tuc chua co Timesheet
 * o trang thai PENDING_APPROVAL/APPROVED cho tuan do.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TimesheetReminderServiceImpl implements TimesheetReminderService {

	private static final String REMINDER_TITLE = "Nhac nop bang cham cong";
	private static final String PM_SUMMARY_TITLE = "Danh sach nhan su chua nop bang cham cong";

	private final TimeEntryRepository timeEntryRepository;
	private final TimesheetRepository timesheetRepository;
	private final NotificationRepository notificationRepository;
	private final NotificationService notificationService;
	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final AuditLogService auditLogService;

	@Override
	public List<Long> findUnsubmittedUserIds(LocalDate weekFrom, LocalDate weekTo) {
		List<Long> draftUserIds = timeEntryRepository.findDistinctUserIdsWithDraftEntriesBetween(weekFrom, weekTo);
		return draftUserIds.stream()
				.filter(userId -> !hasSubmittedTimesheet(userId, weekFrom))
				.toList();
	}

	@Override
	public int sendReminders(LocalDate weekFrom, LocalDate weekTo) {
		List<Long> unsubmittedUserIds = findUnsubmittedUserIds(weekFrom, weekTo);
		if (unsubmittedUserIds.isEmpty()) {
			return 0;
		}

		String employeeReferenceType = employeeReferenceType(weekFrom);
		int remindedCount = 0;
		for (Long userId : unsubmittedUserIds) {
			// QTN-27: chi gui neu chua tung gui nhac cho nguoi nay trong tuan nay.
			if (notificationRepository.existsByRecipientIdAndTypeAndReferenceType(
					userId, NotificationType.TIMESHEET_REMINDER, employeeReferenceType)) {
				continue;
			}
			String content = String.format(
					"Ban chua nop bang cham cong tuan %s - %s. Vui long nop de khong lam cham viec duyet.",
					weekFrom, weekTo);
			notificationService.sendInAppNotification(userId, NotificationType.TIMESHEET_REMINDER,
					REMINDER_TITLE, content, userId, employeeReferenceType);
			remindedCount++;
		}

		notifyProjectManagers(unsubmittedUserIds, weekFrom, weekTo);

		if (remindedCount > 0) {
			auditLogService.record("Nhac nop bang cham cong", AuditTargetType.GENERAL, null,
					"Bang cham cong tuan", "Tuan " + weekFrom + " - " + weekTo + ": da nhac "
							+ remindedCount + " nhan su chua nop");
		}
		return remindedCount;
	}

	private boolean hasSubmittedTimesheet(Long userId, LocalDate weekFrom) {
		return timesheetRepository.findByUserIdAndWeekStartDate(userId, weekFrom)
				.map(Timesheet::getStatus)
				.filter(status -> status == TimesheetStatus.PENDING_APPROVAL || status == TimesheetStatus.APPROVED)
				.isPresent();
	}

	/** Gom nguoi chua nop theo PM phu trach du an cua ho, gui moi PM mot thong bao tong hop. */
	private void notifyProjectManagers(List<Long> unsubmittedUserIds, LocalDate weekFrom, LocalDate weekTo) {
		String pmReferenceType = pmReferenceType(weekFrom);
		Map<Long, List<Long>> employeesByPm = unsubmittedUserIds.stream()
				.collect(Collectors.toMap(userId -> userId, userId -> projectManagersOf(userId, weekFrom, weekTo)))
				.entrySet().stream()
				.flatMap(entry -> entry.getValue().stream().map(pmId -> Map.entry(pmId, entry.getKey())))
				.collect(Collectors.groupingBy(Map.Entry::getKey,
						Collectors.mapping(Map.Entry::getValue, Collectors.toList())));

		for (Map.Entry<Long, List<Long>> entry : employeesByPm.entrySet()) {
			Long pmId = entry.getKey();
			if (notificationRepository.existsByRecipientIdAndTypeAndReferenceType(
					pmId, NotificationType.TIMESHEET_REMINDER, pmReferenceType)) {
				continue;
			}
			String content = String.format("Tuan %s - %s con %d nhan su chua nop bang cham cong: %s",
					weekFrom, weekTo, entry.getValue().size(),
					entry.getValue().stream().map(String::valueOf).collect(Collectors.joining(", ")));
			notificationService.sendInAppNotification(pmId, NotificationType.TIMESHEET_REMINDER,
					PM_SUMMARY_TITLE, content, pmId, pmReferenceType);
		}
	}

	private List<Long> projectManagersOf(Long userId, LocalDate weekFrom, LocalDate weekTo) {
		List<Task> tasks = taskRepository.findByTimeEntriesUserIdAndWorkDateBetween(userId, weekFrom, weekTo);
		Set<Long> pmIds = tasks.stream()
				.map(Task::getProjectId)
				.distinct()
				.map(projectRepository::findById)
				.filter(Optional::isPresent)
				.map(Optional::get)
				.map(Project::getProjectManagerId)
				.filter(Objects::nonNull)
				.collect(Collectors.toSet());
		return List.copyOf(pmIds);
	}

	private String employeeReferenceType(LocalDate weekFrom) {
		return "TimesheetReminder:" + weekFrom;
	}

	private String pmReferenceType(LocalDate weekFrom) {
		return "TimesheetReminderSummary:" + weekFrom;
	}
}
