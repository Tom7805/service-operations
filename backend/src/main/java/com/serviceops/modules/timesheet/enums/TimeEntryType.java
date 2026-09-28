package com.serviceops.modules.timesheet.enums;

/**
 * Vai tro cua mot ban ghi gio cong trong luong dieu chinh bang but toan dao
 * (NCL-06-CN-005, QTN-11).
 *
 * <p>Moi ban ghi gio cong binh thuong (ghi qua NCL-06-CN-001, duyet qua
 * NCL-06-CN-003) la {@link #ORIGINAL}. Khi PM dieu chinh mot dong da duyet,
 * he thong sinh them hai dong moi cung {@code user_id}/{@code task_id}/
 * {@code work_date} voi dong goc — dong goc KHONG bi sua hay xoa:</p>
 * <ul>
 *   <li>{@link #REVERSAL} — dong dao, mang so gio am dung bang so gio cua dong goc,
 *       trieu tieu dong goc trong tong gio da duyet cua cong viec.</li>
 *   <li>{@link #CORRECTION} — dong ghi lai so gio dung, thay the hieu luc cua dong goc.</li>
 * </ul>
 * <p>Ca ba dong (goc, dao, sua) deu ton tai vinh vien va tra cuu duoc qua
 * {@code TimeEntryAdjustment} — day la ban chat "so ghi chep bat bien" cua QTN-11.</p>
 */
public enum TimeEntryType {
	ORIGINAL,
	REVERSAL,
	CORRECTION
}
