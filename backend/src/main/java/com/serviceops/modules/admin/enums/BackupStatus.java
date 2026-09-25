package com.serviceops.modules.admin.enums;

/**
 * Trang thai ban sao luu (NCL-15-CN-003). Chi {@link #COMPLETED} moi duoc dung de phuc hoi —
 * {@link #IN_PROGRESS} (con do dang) va {@link #FAILED} (loi) bi chan o TC-02.
 */
public enum BackupStatus {
	IN_PROGRESS,
	COMPLETED,
	FAILED
}
