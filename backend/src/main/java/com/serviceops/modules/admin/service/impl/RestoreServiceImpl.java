package com.serviceops.modules.admin.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.backup.BackupSettings;
import com.serviceops.modules.admin.backup.DatabaseSnapshotter;
import com.serviceops.modules.admin.backup.MaintenanceLock;
import com.serviceops.modules.admin.dto.request.RestoreConfirmReq;
import com.serviceops.modules.admin.dto.response.RestoreChallengeRes;
import com.serviceops.modules.admin.dto.response.RestoreResultRes;
import com.serviceops.modules.admin.entity.BackupRecord;
import com.serviceops.modules.admin.entity.RestoreRequest;
import com.serviceops.modules.admin.enums.RestoreStatus;
import com.serviceops.modules.admin.repository.BackupRecordRepository;
import com.serviceops.modules.admin.repository.RestoreRequestRepository;
import com.serviceops.modules.admin.service.RestoreService;
import com.serviceops.modules.admin.validator.BackupIntegrityValidator;
import com.serviceops.modules.identity.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

import static com.serviceops.modules.admin.service.impl.AdminSupport.currentUsername;

/**
 * NCL-15-CN-003 + QTN-30: phuc hoi du lieu qua hai buoc.
 *
 * <ol>
 *   <li><b>Buoc 1</b> {@link #requestRestore}: kiem tra ban sao (TC-02) roi cap ma xac nhan ngau nhien 256 bit,
 *       het han sau {@code app.backup.restore-token-ttl-minutes}. CSDL chi luu ban bam SHA-256 cua ma.</li>
 *   <li><b>Buoc 2</b> {@link #confirmRestore}: CHINH quan tri vien da tao yeu cau gui lai ma + mat khau dang nhap.
 *       Sai qua {@code app.backup.restore-max-attempts} lan thi yeu cau bi huy. Dung thi kiem tra lai ban sao va
 *       phuc hoi trong MOT giao dich — loi giua chung thi rollback, du lieu hien tai giu nguyen.</li>
 * </ol>
 *
 * <p>Khong boc ca lop trong {@code @Transactional}: bo dem lan sai o buoc 2 phai duoc luu du sau do nem loi.</p>
 */
@Slf4j
@Service
public class RestoreServiceImpl implements RestoreService {

	static final String WARNING = "Phuc hoi se THAY TOAN BO du lieu van hanh hien tai bang du lieu tai thoi diem"
			+ " cua ban sao. Nhat ky he thong va danh sach ban sao luu duoc giu nguyen.";

	private static final SecureRandom RANDOM = new SecureRandom();

	private final RestoreRequestRepository requestRepository;
	private final BackupRecordRepository backupRepository;
	private final BackupIntegrityValidator integrityValidator;
	private final DatabaseSnapshotter snapshotter;
	private final BackupSettings settings;
	private final MaintenanceLock maintenanceLock;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final ObjectMapper objectMapper;
	private final AuditLogService auditLogService;
	private final Clock clock;
	private final TransactionTemplate restoreTransaction;

	public RestoreServiceImpl(RestoreRequestRepository requestRepository, BackupRecordRepository backupRepository,
			BackupIntegrityValidator integrityValidator, DatabaseSnapshotter snapshotter, BackupSettings settings,
			MaintenanceLock maintenanceLock, UserRepository userRepository, PasswordEncoder passwordEncoder,
			ObjectMapper objectMapper, AuditLogService auditLogService, Clock clock,
			PlatformTransactionManager transactionManager) {
		this.requestRepository = requestRepository;
		this.backupRepository = backupRepository;
		this.integrityValidator = integrityValidator;
		this.snapshotter = snapshotter;
		this.settings = settings;
		this.maintenanceLock = maintenanceLock;
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.objectMapper = objectMapper;
		this.auditLogService = auditLogService;
		this.clock = clock;
		this.restoreTransaction = new TransactionTemplate(transactionManager);
	}

	@Override
	public RestoreChallengeRes requestRestore(Long backupId) {
		BackupRecord backup = requireBackup(backupId);
		try {
			integrityValidator.validate(backup);
		} catch (BusinessRuleException invalid) {
			auditLogService.record("Từ chối phục hồi dữ liệu", AuditTargetType.SYSTEM, backup.getId(),
					"Bản sao lưu " + backup.getCode(), invalid.getMessage());
			throw invalid;
		}

		String token = newToken();
		LocalDateTime now = LocalDateTime.now(clock);
		RestoreRequest request = new RestoreRequest();
		request.setBackupId(backup.getId());
		request.setRequestedBy(requireUsername());
		request.setTokenHash(hash(token));
		request.setStatus(RestoreStatus.PENDING);
		request.setRequestedAt(now);
		request.setExpiresAt(now.plus(settings.getRestoreTokenTtl()));
		request = requestRepository.save(request);

		log.info("RESTORE_REQUESTED requestId={} backup={} by={}", request.getId(), backup.getCode(),
				request.getRequestedBy());
		auditLogService.record("Yêu cầu phục hồi dữ liệu", AuditTargetType.SYSTEM, backup.getId(),
				"Bản sao lưu " + backup.getCode(),
				"Buoc 1/2: tao yeu cau phuc hoi #" + request.getId() + ", ma xac nhan het han luc " + request.getExpiresAt());
		return new RestoreChallengeRes(request.getId(), backup.getId(), backup.getCode(), backup.getStartedAt(), token,
				request.getExpiresAt(), WARNING);
	}

	@Override
	public RestoreResultRes confirmRestore(Long requestId, RestoreConfirmReq body) {
		RestoreRequest request = requestRepository.findById(requestId)
				.orElseThrow(() -> new BusinessRuleException(ErrorCode.RESOURCE_NOT_FOUND,
						"Khong tim thay yeu cau phuc hoi voi id=" + requestId));
		String username = requireUsername();
		if (!request.getRequestedBy().equalsIgnoreCase(username)) {
			throw new BusinessRuleException(ErrorCode.FORBIDDEN,
					"Chi quan tri vien da tao yeu cau phuc hoi moi duoc xac nhan yeu cau nay");
		}
		if (request.getStatus() != RestoreStatus.PENDING) {
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Yeu cau phuc hoi #" + requestId + " da ket thuc (" + request.getStatus() + "), hay tao yeu cau moi");
		}
		LocalDateTime now = LocalDateTime.now(clock);
		if (now.isAfter(request.getExpiresAt())) {
			request.setStatus(RestoreStatus.EXPIRED);
			requestRepository.save(request);
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Ma xac nhan phuc hoi da het han, hay tao yeu cau phuc hoi moi");
		}
		BackupRecord backup = requireBackup(request.getBackupId());
		if (!secondStepPassed(request, body, username)) {
			request.setFailedAttempts(request.getFailedAttempts() + 1);
			boolean exhausted = request.getFailedAttempts() >= settings.getRestoreMaxAttempts();
			if (exhausted) {
				request.setStatus(RestoreStatus.EXPIRED);
			}
			requestRepository.save(request);
			auditLogService.record("Xác nhận phục hồi dữ liệu thất bại", AuditTargetType.SYSTEM, backup.getId(),
					"Bản sao lưu " + backup.getCode(), "Buoc 2/2 sai ma xac nhan hoac mat khau (lan "
							+ request.getFailedAttempts() + ")" + (exhausted ? ", yeu cau #" + requestId + " bi huy" : ""));
			throw new BusinessRuleException(ErrorCode.VALIDATION_ERROR, exhausted
					? "Sai ma xac nhan hoac mat khau qua so lan cho phep, yeu cau phuc hoi da bi huy"
					: "Ma xac nhan hoac mat khau khong dung");
		}

		maintenanceLock.acquire("phuc hoi du lieu");
		try {
			// Kiem tra lai: tep co the bi sua trong khoang giua buoc 1 va buoc 2.
			Path file = integrityValidator.validate(backup);
			JsonNode snapshot = objectMapper.readTree(file.toFile());
			DatabaseSnapshotter.SnapshotStats stats = restoreTransaction.execute(status -> snapshotter.restore(snapshot));

			request.setStatus(RestoreStatus.COMPLETED);
			request.setCompletedAt(LocalDateTime.now(clock));
			requestRepository.save(request);
			log.warn("RESTORE_COMPLETED requestId={} backup={} tables={} rows={} by={}", requestId, backup.getCode(),
					stats.tableCount(), stats.rowCount(), username);
			auditLogService.record("Phục hồi dữ liệu", AuditTargetType.SYSTEM, backup.getId(),
					"Bản sao lưu " + backup.getCode(), "Buoc 2/2: da phuc hoi du lieu ve thoi diem "
							+ backup.getStartedAt() + " (" + stats.tableCount() + " bang, " + stats.rowCount() + " dong)");
			return new RestoreResultRes(request.getId(), backup.getId(), backup.getCode(), request.getStatus(),
					stats.tableCount(), stats.rowCount(), backup.getStartedAt(), request.getCompletedAt());
		} catch (IOException | RuntimeException failure) {
			String reason = failure instanceof BusinessRuleException bre ? bre.getMessage()
					: "Loi khi doc hoac nap ban sao luu: " + failure.getClass().getSimpleName();
			log.error("RESTORE_FAILED requestId={} backup={}", requestId, backup.getCode(), failure);
			request.setStatus(RestoreStatus.FAILED);
			request.setErrorMessage(reason.length() <= 1000 ? reason : reason.substring(0, 1000));
			request.setCompletedAt(LocalDateTime.now(clock));
			requestRepository.save(request);
			auditLogService.record("Phục hồi dữ liệu thất bại", AuditTargetType.SYSTEM, backup.getId(),
					"Bản sao lưu " + backup.getCode(), reason + ". Du lieu hien tai duoc giu nguyen.");
			if (failure instanceof BusinessRuleException bre) {
				throw bre;
			}
			throw new BusinessRuleException(ErrorCode.INVALID_STATE,
					"Phuc hoi that bai, du lieu hien tai duoc giu nguyen: " + reason);
		} finally {
			maintenanceLock.release();
		}
	}

	private boolean secondStepPassed(RestoreRequest request, RestoreConfirmReq body, String username) {
		boolean tokenOk = MessageDigest.isEqual(hash(body.confirmationToken().trim()).getBytes(StandardCharsets.US_ASCII),
				request.getTokenHash().getBytes(StandardCharsets.US_ASCII));
		boolean passwordOk = userRepository.findByUsername(username)
				.map(user -> passwordEncoder.matches(body.password(), user.getPasswordHash()))
				.orElse(false);
		return tokenOk && passwordOk;
	}

	private BackupRecord requireBackup(Long backupId) {
		return backupRepository.findById(backupId).orElseThrow(() -> new BusinessRuleException(
				ErrorCode.RESOURCE_NOT_FOUND, "Khong tim thay ban sao luu voi id=" + backupId));
	}

	private static String requireUsername() {
		String username = currentUsername();
		if (username == null) {
			throw new BusinessRuleException(ErrorCode.FORBIDDEN, "Phai dang nhap de phuc hoi du lieu");
		}
		return username;
	}

	private static String newToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static String hash(String token) {
		return HexFormat.of().formatHex(BackupIntegrityValidator.newDigest()
				.digest(token.getBytes(StandardCharsets.UTF_8)));
	}
}
