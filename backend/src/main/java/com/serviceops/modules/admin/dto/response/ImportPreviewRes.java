package com.serviceops.modules.admin.dto.response;

import com.serviceops.modules.admin.enums.ImportRowStatus;
import com.serviceops.modules.admin.enums.ImportStatus;
import com.serviceops.modules.admin.enums.ImportTargetType;

import java.util.List;
import java.util.Map;

/**
 * NCL-15-CN-004 — bang xem truoc sau khi tai tep len (TC-02, TC-03). Chua co du lieu nao duoc ghi.
 *
 * @param notice nhac day la du lieu mo phong (QTN-04).
 */
public record ImportPreviewRes(
		Long jobId,
		ImportTargetType targetType,
		String fileName,
		ImportStatus status,
		int totalRows,
		int validRows,
		int invalidRows,
		int duplicateRows,
		String notice,
		List<Row> rows
) {

	/**
	 * @param rowNumber        so dong trong tep (dong tieu de la dong 1).
	 * @param data             gia tri da doc theo ten truong chuan.
	 * @param errors           ly do INVALID, hoac mo ta ho so bi trung khi DUPLICATE.
	 * @param duplicateOfId    id ho so da co bi trung (khach hang / ho so nhan su).
	 */
	public record Row(
			int rowNumber,
			ImportRowStatus status,
			Map<String, String> data,
			List<String> errors,
			Long duplicateOfId,
			String duplicateOfLabel
	) {}
}
