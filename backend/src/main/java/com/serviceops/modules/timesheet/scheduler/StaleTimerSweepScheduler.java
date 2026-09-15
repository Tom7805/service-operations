package com.serviceops.modules.timesheet.scheduler;

import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.modules.timesheet.entity.TimesheetTimer;
import com.serviceops.modules.timesheet.repository.TimesheetTimerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

/**
 * NCL-06-CN-008 TC-02: nguoi dung bam Bat dau roi quen bam Dung. Dong ho chay qua 12 gio bi
 * coi la loi thao tac — ra soat dinh ky, tu dong huy cac dong ho do (KHONG tao dong gio cong
 * nao) va nhac nguoi dung tu nhap tay lai cho dung so gio thuc te da lam.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class StaleTimerSweepScheduler {

	private static final int MAX_TIMER_HOURS = 12;

	private final TimesheetTimerRepository timesheetTimerRepository;
	private final NotificationService notificationService;
	private final Clock clock;

	@Scheduled(fixedRate = 30 * 60 * 1000L)
	@Transactional
	public void cancelStaleTimers() {
		LocalDateTime threshold = LocalDateTime.now(clock).minusHours(MAX_TIMER_HOURS);
		List<TimesheetTimer> stale = timesheetTimerRepository.findByStartedAtBefore(threshold);
		if (stale.isEmpty()) {
			return;
		}
		for (TimesheetTimer timer : stale) {
			notificationService.sendInAppNotification(timer.getUserId(), NotificationType.TIMER_AUTO_STOPPED,
					"Dong ho bam gio da tu dong dung",
					"Dong ho ban bat dau luc " + timer.getStartedAt() + " da chay qua " + MAX_TIMER_HOURS
							+ " gio nen bi huy tu dong, khong tao dong gio cong nao."
							+ " Vui long tu nhap tay dong gio cong dung voi thoi gian ban da lam.",
					timer.getTaskId(), "TimesheetTimer");
		}
		timesheetTimerRepository.deleteAll(stale);
		log.info("Ra soat dong ho bam gio qua han: da huy {} dong ho chay qua {} gio", stale.size(), MAX_TIMER_HOURS);
	}
}
