package com.serviceops.modules.admin.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.backup.BackupSettings;
import com.serviceops.modules.admin.backup.DatabaseSnapshotter;
import com.serviceops.modules.admin.backup.MaintenanceLock;
import com.serviceops.modules.admin.dto.response.BackupRecordRes;
import com.serviceops.modules.admin.entity.BackupRecord;
import com.serviceops.modules.admin.enums.BackupStatus;
import com.serviceops.modules.admin.enums.BackupTrigger;
import com.serviceops.modules.admin.mapper.AdminMapper;
import com.serviceops.modules.admin.repository.BackupRecordRepository;
import com.serviceops.modules.admin.service.BackupService;
import com.serviceops.modules.admin.validator.BackupIntegrityValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestOutputStream;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;

import static com.serviceops.modules.admin.service.impl.AdminSupport.blankToNull;
import static com.serviceops.modules.admin.service.impl.AdminSupport.currentUsername;

/**
 * NCL-15-CN-003-TC-01: tao ban sao luu kem thoi diem va dung luong.
 *
 * <p>Co y KHONG boc ca phuong thuc trong mot giao dich: ban ghi {@code IN_PROGRESS} phai duoc luu ngay truoc khi
 * chup du lieu. Tien trinh chet giua chung thi ban ghi van o {@code IN_PROGRESS} — dung la "ban sao con do dang"
 * ma TC-02 chan phuc hoi. Loi trong luc chup thi ban ghi chuyen {@code FAILED} kem ly do va tep do dang bi xoa.</p>
 */
@Slf4j
@Service
public class BackupServiceImpl implements BackupService {

	private static final DateTimeFormatter CODE_TIME = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

	private final BackupRecordRepository repository;
	private final DatabaseSnapshotter snapshotter;
	private final BackupSettings settings;
	private final MaintenanceLock maintenanceLock;
	private final AdminMapper mapper;
	private final AuditLogService auditLogService;
	private final Clock clock;
	private final TransactionTemplate readOnlyTransaction;

	public BackupServiceImpl(BackupRecordRepository repository, DatabaseSnapshotter snapshotter, BackupSettings settings,
			MaintenanceLock maintenanceLock, AdminMapper mapper, AuditLogService auditLogService, Clock clock,
			PlatformTransactionManager transactionManager) {
		this.repository = repository;
		this.snapshotter = snapshotter;
		this.settings = settings;
		this.maintenanceLock = maintenanceLock;
		this.mapper = mapper;
		this.auditLogService = auditLogService;
		this.clock = clock;
		this.readOnlyTransaction = new TransactionTemplate(transactionManager);
		this.readOnlyTransaction.setReadOnly(true);
	}

	@Override
	public BackupRecordRes create(String note, BackupTrigger trigger) {
		maintenanceLock.acquire("sao luu du lieu");
		try {
			return doCreate(blankToNull(note), trigger);
		} finally {
			maintenanceLock.release();
		}
	}

	private BackupRecordRes doCreate(String note, BackupTrigger trigger) {
		LocalDateTime startedAt = LocalDateTime.now(clock);
		BackupRecord record = new BackupRecord();
		record.setStatus(BackupStatus.IN_PROGRESS);
		record.setTriggerType(trigger);
		record.setNote(note);
		record.setCreatedBy(trigger == BackupTrigger.SCHEDULED ? null : currentUsername());
		record.setStartedAt(startedAt);
		record = repository.save(record);
		record.setCode("BK-" + CODE_TIME.format(startedAt) + "-" + record.getId());
		record.setFileName(record.getCode() + ".json");
		record = repository.save(record);

		Path file = settings.getDirectory().resolve(record.getFileName());
		try {
			Files.createDirectories(settings.getDirectory());
			MessageDigest digest = BackupIntegrityValidator.newDigest();
			DatabaseSnapshotter.SnapshotStats stats;
			try (OutputStream out = new DigestOutputStream(new BufferedOutputStream(Files.newOutputStream(file)), digest)) {
				stats = readOnlyTransaction.execute(status -> snapshotter.dump(out));
			}
			record.setStatus(BackupStatus.COMPLETED);
			record.setChecksumSha256(HexFormat.of().formatHex(digest.digest()));
			record.setSizeBytes(Files.size(file));
			record.setTableCount(stats.tableCount());
			record.setRowCount(stats.rowCount());
			record.setCompletedAt(LocalDateTime.now(clock));
			record = repository.save(record);
		} catch (IOException | RuntimeException failure) {
			log.error("BACKUP_FAILED id={} code={}", record.getId(), record.getCode(), failure);
			deleteQuietly(file);
			record.setStatus(BackupStatus.FAILED);
			record.setErrorMessage(truncate(failure.getMessage() == null ? failure.getClass().getSimpleName()
					: failure.getMessage()));
			record.setCompletedAt(LocalDateTime.now(clock));
			record = repository.save(record);
			auditLogService.record("Sao lưu dữ liệu thất bại", AuditTargetType.SYSTEM, record.getId(),
					"Bản sao lưu " + record.getCode(), describe(record) + ", loi: " + record.getErrorMessage());
			return mapper.toBackupRes(record);
		}

		log.info("BACKUP_COMPLETED id={} code={} tables={} rows={} size={}B", record.getId(), record.getCode(),
				record.getTableCount(), record.getRowCount(), record.getSizeBytes());
		auditLogService.record("Sao lưu dữ liệu", AuditTargetType.SYSTEM, record.getId(),
				"Bản sao lưu " + record.getCode(), describe(record));
		return mapper.toBackupRes(record);
	}

	@Override
	public List<BackupRecordRes> list() {
		return repository.findAllByOrderByStartedAtDescIdDesc().stream().map(mapper::toBackupRes).toList();
	}

	@Override
	public BackupRecordRes get(Long id) {
		return repository.findById(id).map(mapper::toBackupRes)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay ban sao luu voi id=" + id));
	}

	private static String describe(BackupRecord record) {
		return (record.getTriggerType() == BackupTrigger.SCHEDULED ? "Sao luu theo lich" : "Sao luu theo yeu cau")
				+ (record.getTableCount() == null ? "" : ", " + record.getTableCount() + " bang, "
						+ record.getRowCount() + " dong, " + record.getSizeBytes() + " byte")
				+ (record.getNote() == null ? "" : ", ghi chu: " + record.getNote());
	}

	private static void deleteQuietly(Path file) {
		try {
			Files.deleteIfExists(file);
		} catch (IOException ignored) {
			// Tep do dang con sot lai khong anh huong: ban ghi da FAILED nen khong bao gio duoc dung de phuc hoi.
		}
	}

	private static String truncate(String message) {
		return message.length() <= 1000 ? message : message.substring(0, 1000);
	}
}
