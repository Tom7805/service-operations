package com.serviceops.modules.admin.service;

import com.serviceops.modules.admin.dto.response.BackupRecordRes;
import com.serviceops.modules.admin.enums.BackupTrigger;

import java.util.List;

/** NCL-15-CN-003: tao va tra cuu ban sao luu du lieu van hanh. */
public interface BackupService {

	/**
	 * TC-01: tao ban sao luu (theo yeu cau hoac theo lich). Loi giua chung khong nem ra ngoai ma luu ban ghi
	 * {@code FAILED} kem ly do — ban ghi do bi chan khi phuc hoi (TC-02).
	 */
	BackupRecordRes create(String note, BackupTrigger trigger);

	List<BackupRecordRes> list();

	BackupRecordRes get(Long id);
}
