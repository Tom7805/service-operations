package com.serviceops.modules.timesheet.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Mot dong lich su duyet/tu choi bang cham cong CUA CHINH PM DANG XEM (NCL-06-CN-003/CN-004).
 *
 * <p>Man hinh "Duyet bang cham cong" chi hien hang cho duyet ({@code GET /timesheets/pending}) —
 * sau khi PM duyet/tu choi, bang bien khoi hang cho vi da co quyet dinh, khong phai vi mat du
 * lieu. DTO nay phuc vu {@code GET /timesheets/approval-history} de PM tra lai chinh xac "minh
 * vua xu ly cai gi, cho ai, luc nao" — du lieu lay tu {@code audit_logs} da duoc ghi san trong
 * cung transaction voi thao tac duyet/tu choi ({@link com.serviceops.modules.timesheet.service.impl.TimesheetApprovalServiceImpl}),
 * khong them bang du lieu moi.</p>
 *
 * @param auditLogId     ma ban ghi nhat ky — dung lam khoa duy nhat cho tung dong lich su (mot
 *                       bang co the xuat hien nhieu lan neu duoc xu ly nhieu dot boi cac PM khac
 *                       nhau cho cac du an khac nhau trong cung bang).
 * @param timesheetId    ma bang cham cong tuan.
 * @param userId         nhan su nop bang.
 * @param userName       ho ten nhan su nop bang, de hien thi thay vi chi co ma so.
 * @param weekStartDate  ngay dau tuan cham cong.
 * @param weekEndDate    ngay cuoi tuan cham cong.
 * @param action         {@code APPROVED} hoac {@code REJECTED} — hanh dong PM da thuc hien.
 * @param detail         noi dung nhat ky (so dong, so gio, canh bao vuot ngan sach hoac ly do tu choi).
 * @param performedAt    thoi diem PM thuc hien thao tac.
 */
public record TimesheetApprovalHistoryRes(Long auditLogId, Long timesheetId, Long userId, String userName,
		LocalDate weekStartDate, LocalDate weekEndDate, String action, String detail, LocalDateTime performedAt) {
}
