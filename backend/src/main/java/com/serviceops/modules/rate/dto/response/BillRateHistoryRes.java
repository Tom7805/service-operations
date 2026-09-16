package com.serviceops.modules.rate.dto.response;

import java.util.List;

/**
 * Toàn bộ các mốc đơn giá đã khai báo cho một cặp (vai trò, cấp bậc), mới cũ theo
 * {@code effectiveFrom} tăng dần — NCL-07-CN-007.
 *
 * @param professionalRole vai trò chuyên môn đã tra (khớp giá trị gửi lên, không phải khớp gần đúng).
 * @param level            cấp bậc đã tra.
 * @param entries          danh sách mốc hiệu lực, {@code effectiveFrom} tăng dần.
 * @param everChanged      {@code true} khi có từ hai mốc trở lên (TC-01); {@code false} khi chỉ có
 *                         đúng một mốc — Frontend hiển thị rõ "chưa từng thay đổi" (TC-02).
 */
public record BillRateHistoryRes(
		String professionalRole,
		String level,
		List<BillRateHistoryEntryRes> entries,
		boolean everChanged) {
}
