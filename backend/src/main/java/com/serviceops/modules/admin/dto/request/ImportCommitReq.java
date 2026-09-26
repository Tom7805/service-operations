package com.serviceops.modules.admin.dto.request;

import com.serviceops.modules.admin.enums.DuplicateAction;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * NCL-15-CN-004 — xac nhan nhap. Chi dong hop le va dong trung duoc xu ly; dong loi khong bao gio duoc nhap.
 *
 * @param duplicateAction cach xu ly MAC DINH cho moi dong trung ho so da co (TC-03). Bat buoc khi tep co dong trung
 *                        ma {@code rowActions} khong phu het.
 * @param rowActions      cach xu ly rieng cho tung dong trung (ghi de {@code duplicateAction}).
 */
public record ImportCommitReq(
		DuplicateAction duplicateAction,
		@Valid List<RowAction> rowActions
) {

	public record RowAction(
			@NotNull(message = "Thieu so dong") Integer rowNumber,
			@NotNull(message = "Phai chon bo qua (SKIP) hoac cap nhat (UPDATE)") DuplicateAction action
	) {}
}
