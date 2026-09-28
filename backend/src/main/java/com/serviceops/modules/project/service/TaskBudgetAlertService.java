package com.serviceops.modules.project.service;

import com.serviceops.modules.project.entity.Task;

import java.util.Collection;
import java.util.List;

/**
 * Danh gia cong viec vuot nguong ngan sach gio cong (QTN-20) va gui canh bao
 * {@code TASK_BUDGET_EXCEEDED} qua co che chong gui trung theo dot (NCL-14-CN-003, QTN-27).
 * Dung chung cho tac vu nen ({@code TaskBudgetAlertScheduler}) va luong duyet bang cham cong
 * (NCL-06-CN-003 TC-03 — canh bao ngay khi duyet).
 */
public interface TaskBudgetAlertService {

	/** Danh gia mot cong viec; tra ve danh sach recipientId thuc su duoc gui. */
	List<Long> evaluate(Task task);

	/**
	 * Danh gia cac cong viec vua duoc duyet gio cong — chay SAU KHI giao dich duyet commit, trong
	 * giao dich rieng, va khong bao gio nem loi ra ngoai (loi canh bao khong duoc lam hong viec duyet).
	 */
	void evaluateAfterCommit(Collection<Long> taskIds);
}
