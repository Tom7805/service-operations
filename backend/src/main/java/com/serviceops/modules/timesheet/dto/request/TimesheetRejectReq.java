package com.serviceops.modules.timesheet.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * NCL-06-CN-004: tu choi bang cham cong.
 *
 * <p>TC-02: ly do tu choi la bat buoc — thieu ly do bi tra ve loi validate truoc khi cham vao
 * ban ghi bang cham cong.</p>
 */
public record TimesheetRejectReq(
		@NotBlank(message = "Ly do tu choi khong duoc de trong")
		@Size(max = 1000, message = "Ly do tu choi toi da 1000 ky tu")
		String reason) {
}
