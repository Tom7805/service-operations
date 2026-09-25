package com.serviceops.modules.admin.validator;

import com.serviceops.common.exception.BusinessRuleException;
import com.serviceops.common.exception.ErrorCode;
import com.serviceops.modules.admin.backup.BackupSettings;
import com.serviceops.modules.admin.entity.BackupRecord;
import com.serviceops.modules.admin.enums.BackupStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * NCL-15-CN-003-TC-02: chan phuc hoi tu ban sao loi hoac con do dang. Ban sao hop le khi dong thoi:
 * <ol>
 *   <li>trang thai {@code COMPLETED} (khong phai {@code IN_PROGRESS} / {@code FAILED});</li>
 *   <li>tep con ton tai trong thu muc sao luu;</li>
 *   <li>SHA-256 cua tep khop checksum luc tao — tep bi cat cut, bi sua tay hay hong dia deu bi phat hien.</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
public class BackupIntegrityValidator {

	private final BackupSettings settings;

	/** @return duong dan tep da kiem tra, san sang de doc. */
	public Path validate(BackupRecord backup) {
		if (backup.getStatus() != BackupStatus.COMPLETED) {
			throw invalid(backup, backup.getStatus() == BackupStatus.IN_PROGRESS
					? "ban sao con dang tao do dang"
					: "ban sao bi loi khi tao" + (backup.getErrorMessage() == null ? "" : ": " + backup.getErrorMessage()));
		}
		Path file = resolve(backup);
		if (file == null || !Files.isRegularFile(file)) {
			throw invalid(backup, "khong tim thay tep sao luu");
		}
		String actual;
		try {
			actual = sha256(file);
		} catch (IOException e) {
			throw invalid(backup, "khong doc duoc tep sao luu");
		}
		if (!actual.equalsIgnoreCase(backup.getChecksumSha256())) {
			throw invalid(backup, "tep sao luu da bi thay doi hoac hong (sai checksum)");
		}
		return file;
	}

	public Path resolve(BackupRecord backup) {
		if (backup.getFileName() == null) {
			return null;
		}
		Path file = settings.getDirectory().resolve(backup.getFileName()).normalize();
		// Ten tep luu trong CSDL — khong cho thoat ra ngoai thu muc sao luu.
		return file.startsWith(settings.getDirectory()) ? file : null;
	}

	public static String sha256(Path file) throws IOException {
		MessageDigest digest = newDigest();
		try (InputStream in = Files.newInputStream(file)) {
			byte[] buffer = new byte[64 * 1024];
			int read;
			while ((read = in.read(buffer)) != -1) {
				digest.update(buffer, 0, read);
			}
		}
		return HexFormat.of().formatHex(digest.digest());
	}

	public static MessageDigest newDigest() {
		try {
			return MessageDigest.getInstance("SHA-256");
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("JVM khong ho tro SHA-256", e);
		}
	}

	private static BusinessRuleException invalid(BackupRecord backup, String reason) {
		return new BusinessRuleException(ErrorCode.INVALID_STATE,
				"Ban sao luu " + backup.getCode() + " khong hop le (" + reason + "), khong the phuc hoi");
	}
}
