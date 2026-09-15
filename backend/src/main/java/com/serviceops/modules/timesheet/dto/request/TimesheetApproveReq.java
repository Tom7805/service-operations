package com.serviceops.modules.timesheet.dto.request;

import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request duyet bang cham cong (NCL-06-CN-003).
 *
 * <p>Hai che do duyet:</p>
 * <ul>
 *   <li><b>Nguyen bang (bulk)</b> — bo qua {@code entryIds}: he thong duyet toan
 *       bo dong SUBMITTED cua tuan thuoc du an ma nguoi goi quan ly (TC-02);
 *       dong thuoc du an cua PM khac giu nguyen cho PM do duyet.</li>
 *   <li><b>Tung dong (rieng le)</b> — truyen {@code entryIds}: chi duyet cac dong
 *       do, moi dong van phai thuoc du an nguoi goi quan ly.</li>
 * </ul>
 *
 * @param entryIds danh sach dong gio cong can duyet; null/rong = duyet nguyen bang.
 * @param note     ghi chu cua PM khi duyet (khong bat buoc).
 */
public record TimesheetApproveReq(List<Long> entryIds,
		@Size(max = 1000, message = "Ghi chu khong duoc vuot 1000 ky tu") String note) {
}
