package com.serviceops.modules.timesheet.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Mot dong gio cong DA DUYET, con la dong GOC va chua tung duoc dieu chinh — du dieu kien
 * de PM chon tao but toan dao (NCL-06-CN-005, QTN-11).
 *
 * <p>Nguon danh sach cho man hinh "Dieu chinh gio cong da duyet": PM chon truc tiep tu bang
 * nay thay vi phai biet truoc Project ID/Task ID/Entry ID.</p>
 *
 * @param entryId     ma dong gio cong goc.
 * @param projectId   du an chua cong viec.
 * @param projectName ten du an, hien thi cho PM de chon dung dong.
 * @param taskId      cong viec duoc ghi gio.
 * @param taskName    ten cong viec.
 * @param userId      nhan su da ghi dong gio cong nay.
 * @param workDate    ngay lam viec cua dong gio cong.
 * @param hours       so gio da duyet.
 * @param note        ghi chu cua nhan su khi ghi gio, giup PM nhan dien dung dong can sua.
 */
public record AdjustableEntryRes(Long entryId, Long projectId, String projectName, Long taskId, String taskName,
		Long userId, LocalDate workDate, BigDecimal hours, String note) {
}
