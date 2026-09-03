package com.serviceops.modules.opportunity.enums;

/**
 * Hanh dong ghi nhat ky co hoi ban hang (NCL-03-CN-001, TC-04).
 */
public enum OpportunityAuditAction {
	/** Tao co hoi ban hang moi (TC-04). */
	CREATE,

	/** Truy cap tinh nang co hoi bi tu choi vi khong co quyen (TC-03). */
	DENIED_ACCESS
}