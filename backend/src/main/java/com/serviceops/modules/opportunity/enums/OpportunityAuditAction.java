package com.serviceops.modules.opportunity.enums;

/**
 * Hanh dong ghi nhat ky co hoi ban hang (NCL-03-CN-001, TC-04).
 */
public enum OpportunityAuditAction {
	/** Tao co hoi ban hang moi (TC-04). */
	CREATE,

	/** Truy cap tinh nang co hoi bi tu choi vi khong co quyen (TC-03). */
	DENIED_ACCESS,

	/** Dong co hoi voi ket qua THANG (NCL-03-CN-005, TC-04). */
	CLOSE_WON,

	/** Dong co hoi voi ket qua THUA, kem ly do thua (NCL-03-CN-005, TC-02/TC-04). */
	CLOSE_LOST,

	/** Them mot hoat dong cham soc moi cho co hoi (NCL-03-CN-006, TC-04). */
	ACTIVITY_ADD
}
