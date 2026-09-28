package com.serviceops.modules.admin.service;

import com.serviceops.modules.admin.dto.request.RestoreConfirmReq;
import com.serviceops.modules.admin.dto.response.RestoreChallengeRes;
import com.serviceops.modules.admin.dto.response.RestoreResultRes;

/**
 * NCL-15-CN-003 / QTN-30: phuc hoi du lieu tu ban sao luu, luon qua hai buoc xac nhan.
 */
public interface RestoreService {

	/**
	 * Buoc 1: kiem tra ban sao (TC-02 — loi, do dang hoac sai checksum thi {@code INVALID_STATE}) roi cap ma
	 * xac nhan co han dung.
	 */
	RestoreChallengeRes requestRestore(Long backupId);

	/**
	 * Buoc 2: chinh quan tri vien da tao yeu cau gui lai ma + mat khau; dung thi phuc hoi trong mot giao dich
	 * (loi giua chung thi du lieu hien tai giu nguyen).
	 */
	RestoreResultRes confirmRestore(Long requestId, RestoreConfirmReq request);
}
