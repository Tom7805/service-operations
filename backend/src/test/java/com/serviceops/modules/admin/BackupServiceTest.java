package com.serviceops.modules.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.backup.BackupSettings;
import com.serviceops.modules.admin.backup.DatabaseSnapshotter;
import com.serviceops.modules.admin.backup.MaintenanceLock;
import com.serviceops.modules.admin.dto.request.RestoreConfirmReq;
import com.serviceops.modules.admin.dto.response.BackupRecordRes;
import com.serviceops.modules.admin.dto.response.RestoreChallengeRes;
import com.serviceops.modules.admin.dto.response.RestoreResultRes;
import com.serviceops.modules.admin.entity.BackupRecord;
import com.serviceops.modules.admin.enums.BackupStatus;
import com.serviceops.modules.admin.enums.BackupTrigger;
import com.serviceops.modules.admin.enums.RestoreStatus;
import com.serviceops.modules.admin.mapper.AdminMapper;
import com.serviceops.modules.admin.repository.BackupRecordRepository;
import com.serviceops.modules.admin.repository.RestoreRequestRepository;
import com.serviceops.modules.admin.service.BackupService;
import com.serviceops.modules.admin.service.RestoreService;
import com.serviceops.modules.admin.service.impl.BackupServiceImpl;
import com.serviceops.modules.admin.service.impl.RestoreServiceImpl;
import com.serviceops.modules.admin.validator.BackupIntegrityValidator;
import com.serviceops.modules.identity.user.entity.User;
import com.serviceops.modules.identity.user.enums.UserStatus;
import com.serviceops.modules.identity.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/**
 * BE-QA NCL-15-CN-003 / QTN-30 tren CSDL that (H2): sao luu theo yeu cau (TC-01), chan phuc hoi tu ban sao loi, do
 * dang hoac bi sua (TC-02), phuc hoi hai buoc dua du lieu ve dung thoi diem sao luu, nhat ky (TC-04).
 *
 * <p>Chay KHONG boc giao dich test: phuc hoi tren H2 dung {@code SET REFERENTIAL_INTEGRITY} — lenh nay tu commit
 * giao dich dang mo. Du lieu tao ra duoc don o {@link #cleanUp()}.</p>
 */
@DataJpaTest(properties = {"spring.flyway.enabled=false", "app.backup.dir=target/test-backups"})
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({BackupServiceImpl.class, RestoreServiceImpl.class, DatabaseSnapshotter.class, BackupSettings.class,
		MaintenanceLock.class, BackupIntegrityValidator.class, AdminMapper.class, BackupServiceTest.Config.class})
class BackupServiceTest {

	private static final String PASSWORD = "Matkhau@123";

	@TestConfiguration
	static class Config {
		@Bean
		Clock clock() {
			return Clock.fixed(Instant.parse("2026-09-25T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
		}

		@Bean
		PasswordEncoder passwordEncoder() {
			return new BCryptPasswordEncoder(4);
		}

		@Bean
		ObjectMapper objectMapper() {
			return new ObjectMapper();
		}
	}

	@MockBean private AuditLogService auditLogService;
	@Autowired private BackupService backupService;
	@Autowired private RestoreService restoreService;
	@Autowired private BackupRecordRepository backupRepository;
	@Autowired private RestoreRequestRepository restoreRequestRepository;
	@Autowired private UserRepository userRepository;
	@Autowired private BackupSettings settings;
	@Autowired private PasswordEncoder passwordEncoder;
	@Autowired private JdbcTemplate jdbc;

	@BeforeEach
	void setUp() {
		cleanUp();
		User admin = new User();
		admin.setUsername("admin.backup");
		admin.setPasswordHash(passwordEncoder.encode(PASSWORD));
		admin.setFullName("Quan tri vien");
		admin.setStatus(UserStatus.ACTIVE);
		userRepository.save(admin);
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin.backup",
				null, List.of(new SimpleGrantedAuthority("ROLE_VT-07"))));
		insertService(1, "Tu van ban dau");
	}

	@AfterEach
	void cleanUp() {
		SecurityContextHolder.clearContext();
		jdbc.update("DELETE FROM restore_requests");
		jdbc.update("DELETE FROM backup_records");
		jdbc.update("DELETE FROM service_prices");
		jdbc.update("DELETE FROM service_catalog_items");
		jdbc.update("DELETE FROM users WHERE username = 'admin.backup'");
	}

	@Test
	@DisplayName("TC-01: tao ban sao luu theo yeu cau -> luu kem thoi diem, dung luong, checksum; ghi nhat ky")
	void createBackup() throws Exception {
		BackupRecordRes backup = backupService.create("Truoc khi nang cap", BackupTrigger.MANUAL);

		assertThat(backup.status()).isEqualTo(BackupStatus.COMPLETED);
		assertThat(backup.startedAt()).isEqualTo(LocalDateTime.of(2026, 9, 25, 10, 0));
		assertThat(backup.sizeBytes()).isPositive();
		assertThat(backup.checksumSha256()).hasSize(64);
		assertThat(backup.rowCount()).isPositive();
		assertThat(backup.restorable()).isTrue();
		Path file = settings.getDirectory().resolve(backup.fileName());
		assertThat(Files.size(file)).isEqualTo(backup.sizeBytes());
		assertThat(Files.readString(file)).contains(DatabaseSnapshotter.FORMAT).contains("Tu van ban dau")
				// Nhat ky va chinh bang sao luu khong nam trong ban sao.
				.doesNotContain("\"name\":\"backup_records\"").doesNotContain("\"name\":\"audit_logs\"");
		verify(auditLogService).record(eq("Sao lưu dữ liệu"), eq(AuditTargetType.SYSTEM), eq(backup.id()),
				anyString(), anyString());
	}

	@Test
	@DisplayName("QTN-30: phuc hoi hai buoc dua du lieu ve dung thoi diem cua ban sao")
	void twoStepRestoreBringsDataBack() {
		BackupRecordRes backup = backupService.create(null, BackupTrigger.MANUAL);
		// Du lieu thay doi sau khi sao luu.
		jdbc.update("UPDATE service_catalog_items SET name = 'Da bi sua' WHERE id = 1");
		insertService(2, "Dich vu tao sau sao luu");

		RestoreChallengeRes challenge = restoreService.requestRestore(backup.id());
		assertThat(challenge.confirmationToken()).hasSizeGreaterThan(40);
		assertThat(challenge.expiresAt()).isEqualTo(LocalDateTime.of(2026, 9, 25, 10, 5));
		// CSDL chi luu ban bam cua ma, khong luu ma goc.
		assertThat(restoreRequestRepository.findById(challenge.requestId()).orElseThrow().getTokenHash())
				.isNotEqualTo(challenge.confirmationToken());

		RestoreResultRes result = restoreService.confirmRestore(challenge.requestId(),
				new RestoreConfirmReq(challenge.confirmationToken(), PASSWORD));

		assertThat(result.status()).isEqualTo(RestoreStatus.COMPLETED);
		assertThat(result.restoredToPointInTime()).isEqualTo(backup.startedAt());
		assertThat(jdbc.queryForList("SELECT name FROM service_catalog_items ORDER BY id", String.class))
				.containsExactly("Tu van ban dau");
		// Danh sach ban sao luu khong bi phuc hoi de len.
		assertThat(backupRepository.count()).isEqualTo(1);
		verify(auditLogService).record(eq("Phục hồi dữ liệu"), eq(AuditTargetType.SYSTEM), eq(backup.id()),
				anyString(), anyString());
	}

	@Test
	@DisplayName("QTN-30: buoc 2 sai mat khau / sai ma -> tu choi, dem so lan sai; qua 3 lan thi huy yeu cau")
	void secondStepRejectsWrongFactors() {
		BackupRecordRes backup = backupService.create(null, BackupTrigger.MANUAL);
		RestoreChallengeRes challenge = restoreService.requestRestore(backup.id());
		jdbc.update("UPDATE service_catalog_items SET name = 'Khong duoc phuc hoi' WHERE id = 1");

		assertThatThrownBy(() -> restoreService.confirmRestore(challenge.requestId(),
				new RestoreConfirmReq(challenge.confirmationToken(), "sai-mat-khau")))
				.extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
		assertThatThrownBy(() -> restoreService.confirmRestore(challenge.requestId(),
				new RestoreConfirmReq("ma-sai", PASSWORD)))
				.extracting("errorCode").isEqualTo(ErrorCode.VALIDATION_ERROR);
		assertThatThrownBy(() -> restoreService.confirmRestore(challenge.requestId(),
				new RestoreConfirmReq("ma-sai", PASSWORD)))
				.hasMessageContaining("da bi huy");

		assertThat(restoreRequestRepository.findById(challenge.requestId()).orElseThrow().getStatus())
				.isEqualTo(RestoreStatus.EXPIRED);
		// Ke ca gui dung sau khi da huy cung khong phuc hoi.
		assertThatThrownBy(() -> restoreService.confirmRestore(challenge.requestId(),
				new RestoreConfirmReq(challenge.confirmationToken(), PASSWORD)))
				.extracting("errorCode").isEqualTo(ErrorCode.INVALID_STATE);
		assertThat(jdbc.queryForObject("SELECT name FROM service_catalog_items WHERE id = 1", String.class))
				.isEqualTo("Khong duoc phuc hoi");
	}

	@Test
	@DisplayName("QTN-30: quan tri vien khac khong xac nhan duoc yeu cau cua nguoi khac")
	void onlyRequesterCanConfirm() {
		BackupRecordRes backup = backupService.create(null, BackupTrigger.MANUAL);
		RestoreChallengeRes challenge = restoreService.requestRestore(backup.id());
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin.khac",
				null, List.of(new SimpleGrantedAuthority("ROLE_VT-07"))));

		assertThatThrownBy(() -> restoreService.confirmRestore(challenge.requestId(),
				new RestoreConfirmReq(challenge.confirmationToken(), PASSWORD)))
				.extracting("errorCode").isEqualTo(ErrorCode.FORBIDDEN);
	}

	@Test
	@DisplayName("TC-02: ban sao con do dang hoac bi loi -> chan phuc hoi, bao ban sao khong hop le")
	void incompleteOrFailedBackupRejected() {
		for (BackupStatus status : List.of(BackupStatus.IN_PROGRESS, BackupStatus.FAILED)) {
			BackupRecord record = new BackupRecord();
			record.setCode("BK-" + status);
			record.setStatus(status);
			record.setTriggerType(BackupTrigger.MANUAL);
			record.setStartedAt(LocalDateTime.of(2026, 9, 25, 9, 0));
			Long id = backupRepository.save(record).getId();

			assertThatThrownBy(() -> restoreService.requestRestore(id))
					.isInstanceOf(BusinessRuleException.class)
					.hasMessageContaining("khong hop le")
					.extracting("errorCode").isEqualTo(ErrorCode.INVALID_STATE);
		}
		assertThat(restoreRequestRepository.count()).isZero();
	}

	@Test
	@DisplayName("TC-02: tep sao luu bi sua sau khi tao (sai checksum) -> chan phuc hoi")
	void tamperedBackupRejected() throws Exception {
		BackupRecordRes backup = backupService.create(null, BackupTrigger.MANUAL);
		Files.writeString(settings.getDirectory().resolve(backup.fileName()), " ", StandardOpenOption.APPEND);

		assertThatThrownBy(() -> restoreService.requestRestore(backup.id()))
				.hasMessageContaining("sai checksum")
				.extracting("errorCode").isEqualTo(ErrorCode.INVALID_STATE);
		verify(auditLogService).record(eq("Từ chối phục hồi dữ liệu"), eq(AuditTargetType.SYSTEM), eq(backup.id()),
				anyString(), anyString());
	}

	private void insertService(long id, String name) {
		jdbc.update("INSERT INTO service_catalog_items (id, code, name, name_normalized, unit, active, created_at, updated_at)"
				+ " VALUES (?, ?, ?, ?, 'gio', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
				id, "DV0000" + id, name, name.toLowerCase());
	}
}
