package com.serviceops.modules.admin.backup;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.time.Duration;

/**
 * Cau hinh sao luu (NCL-15-CN-003) — xem khoi {@code app.backup} trong {@code application.yml}.
 */
@Getter
@Component
public class BackupSettings {

	/** Thu muc chua tep sao luu. */
	private final Path directory;

	/** Thoi han cua ma xac nhan phuc hoi o buoc 1 (QTN-30). */
	private final Duration restoreTokenTtl;

	/** So lan buoc 2 duoc gui sai truoc khi yeu cau phuc hoi bi huy. */
	private final int restoreMaxAttempts;

	public BackupSettings(@Value("${app.backup.dir:./data/backups}") String directory,
			@Value("${app.backup.restore-token-ttl-minutes:5}") long restoreTokenTtlMinutes,
			@Value("${app.backup.restore-max-attempts:3}") int restoreMaxAttempts) {
		this.directory = Path.of(directory).toAbsolutePath().normalize();
		this.restoreTokenTtl = Duration.ofMinutes(restoreTokenTtlMinutes);
		this.restoreMaxAttempts = restoreMaxAttempts;
	}
}
