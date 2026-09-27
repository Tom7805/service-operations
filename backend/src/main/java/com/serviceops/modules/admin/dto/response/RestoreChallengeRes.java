package com.serviceops.modules.admin.dto.response;

import java.time.LocalDateTime;

/**
 * QTN-30 — ket qua buoc 1 cua phuc hoi. {@link #confirmationToken} chi tra ve MOT lan o day (he thong chi luu
 * ban bam); buoc 2 phai gui lai ma nay truoc {@link #expiresAt} kem mat khau.
 *
 * @param warning canh bao hien cho quan tri vien: du lieu hien tai se bi thay bang du lieu cua ban sao.
 */
public record RestoreChallengeRes(
		Long requestId,
		Long backupId,
		String backupCode,
		LocalDateTime backupCreatedAt,
		String confirmationToken,
		LocalDateTime expiresAt,
		String warning
) {}
