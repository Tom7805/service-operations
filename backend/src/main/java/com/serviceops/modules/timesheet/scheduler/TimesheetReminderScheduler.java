package com.serviceops.modules.timesheet.scheduler;

import com.serviceops.modules.timesheet.service.TimesheetReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * NCL-06-CN-009: cuoi tuan ra soat va nhac nhan su con bang cham cong chua nop.
 *
 * <p>Chay moi Chu Nhat luc 20h00 (gio server), ra soat dung tuan Thu Hai -
 * Chu Nhat vua ket thuc trong ngay hom do.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TimesheetReminderScheduler {

	private final TimesheetReminderService timesheetReminderService;
	private final Clock clock;

	@Scheduled(cron = "0 0 20 * * SUN")
	public void remindUnsubmittedTimesheets() {
		LocalDate today = LocalDate.now(clock);
		LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
		LocalDate weekEnd = weekStart.plusDays(6);
		int reminded = timesheetReminderService.sendReminders(weekStart, weekEnd);
		log.info("Ra soat nhac nop bang cham cong tuan {} - {}: da nhac {} nhan su",
				weekStart, weekEnd, reminded);
	}
}
