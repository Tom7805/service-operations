package com.serviceops.modules.project.enums;

public enum ProjectAuditAction {
	CREATE_FROM_CONTRACT,

	/** Tao du an tu mau co san cay cong viec (NCL-05-CN-007). */
	CREATE_FROM_TEMPLATE,

	/** Quan ly moc tien do cua du an (NCL-05-CN-008 / TC-04). */
	MILESTONE_CREATED,
	MILESTONE_UPDATED,
	MILESTONE_DELETED,

	/** Quan ly rui ro cua du an (NCL-05-CN-009 / TC-04). */
	RISK_CREATED,
	RISK_UPDATED,
	RISK_DELETED,

	TASK_PROGRESS_UPDATED,
	TASK_BUDGET_UPDATED,

	/** Ghi/sua/xoa gio cong theo cong viec (NCL-06-CN-001 / TC-04). */
	TIME_ENTRY_UPDATED,

	PROJECT_CLOSED
}
