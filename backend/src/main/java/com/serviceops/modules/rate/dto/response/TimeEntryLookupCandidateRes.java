package com.serviceops.modules.rate.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Mot dong gio cong DA DUYET, hien de Ke toan/Quan tri vien chon truc tiep khi tra don gia
 * (NCL-07-CN-005) thay vi phai tu biet truoc "ID dong gio cong" — con so ky thuat ma truoc
 * gio chi hien o man hinh "Dieu chinh gio cong da duyet", von chi danh cho Quan ly du an
 * (VT-02) chu khong phai Ke toan/Quan tri vien la nguoi thuc su can tra don gia.
 *
 * @param entryId     ma dong gio cong, dung lam tham so goi /timesheet-entries/{entryId}/bill-rate/resolve.
 * @param workDate    ngay lam viec cua dong gio cong.
 * @param userId      nhan su thuc hien.
 * @param userName    ho ten nhan su, de nhan dien thay vi chi co ID.
 * @param projectId   du an chua cong viec.
 * @param projectName ten du an.
 * @param taskId      cong viec duoc ghi gio.
 * @param taskName    ten cong viec.
 * @param hours       so gio da duyet.
 */
public record TimeEntryLookupCandidateRes(Long entryId, LocalDate workDate, Long userId, String userName,
		Long projectId, String projectName, Long taskId, String taskName, BigDecimal hours) {
}
