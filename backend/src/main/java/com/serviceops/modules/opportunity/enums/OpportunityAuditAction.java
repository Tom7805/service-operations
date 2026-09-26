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
	ACTIVITY_ADD,

	/** Sinh bao cao duong ong ban hang theo giai doan (NCL-03-CN-007, TC-04). */
	REPORT_VIEW,

	/** Chuyen giai doan co hoi (NCL-03-CN-002, TC-05). */
	STAGE_CHANGE,

	/** Lap mot phien ban bao gia cho co hoi (NCL-03-CN-003, TC-05). */
	QUOTE_CREATE,

	/** Xem bao cao du bao doanh thu theo xac suat giai doan (NCL-03-CN-004, TC-04). */
	FORECAST_VIEW,

	/** Tao hop dong tu co hoi da thang (NCL-04-CN-001, TC-04). */
	CONTRACT_CREATE
}
