package com.serviceops.modules.admin.backup;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.modules.admin.dto.response.BackupRecordRes;
import com.serviceops.modules.admin.enums.BackupTrigger;
import com.serviceops.modules.admin.service.BackupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * NCL-15-CN-003: sao luu theo lich. Lich lay tu {@code app.backup.schedule-cron} (bien moi truong
 * {@code BACKUP_CRON}); gia tri "-" (mac dinh) la tat.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BackupScheduler {

	private final BackupService backupService;

	@Scheduled(cron = "${app.backup.schedule-cron:-}")
	public void runScheduledBackup() {
		try {
			BackupRecordRes result = backupService.create("Sao luu tu dong theo lich", BackupTrigger.SCHEDULED);
			log.info("Sao luu theo lich: {} - {}", result.code(), result.status());
		} catch (BusinessRuleException busy) {
			// Dang co sao luu / phuc hoi khac — bo qua lan nay, lan hen sau se chay.
			log.warn("Bo qua sao luu theo lich: {}", busy.getMessage());
		}
	}
}
