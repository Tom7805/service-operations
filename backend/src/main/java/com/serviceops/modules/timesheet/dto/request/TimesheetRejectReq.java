package com.serviceops.modules.timesheet.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request tu choi bang cham cong (NCL-06-CN-004).
 *
 * <p>Hai che do, giong {@code TimesheetApproveReq}:</p>
 * <ul>
 *   <li><b>Nguyen bang (bulk)</b> — bo qua {@code entryIds}: tu choi toan bo dong
 *       SUBMITTED cua tuan thuoc du an ma nguoi goi quan ly; dong thuoc du an
 *       cua PM khac giu nguyen cho PM do xu ly.</li>
 *   <li><b>Tung dong (rieng le)</b> — truyen {@code entryIds}: chi tu choi cac dong
 *       do, moi dong van phai thuoc du an nguoi goi quan ly.</li>
 * </ul>
 *
 * <p>TC-02: {@code reason} la bat buoc — thieu ly do bi tra ve {@code 400 VALIDATION_ERROR}
 * truoc khi cham vao ban ghi bang cham cong.</p>
 *
 * @param entryIds danh sach dong gio cong can tu choi; null/rong = tu choi nguyen bang.
 * @param reason   ly do tu choi (bat buoc).
 */
public record TimesheetRejectReq(
		List<Long> entryIds,
		@NotBlank(message = "Ly do tu choi khong duoc de trong")
		@Size(max = 1000, message = "Ly do tu choi khong duoc vuot 1000 ky tu")
		String reason) {
}
