package com.serviceops.modules.rate.dto.response;

/**
 * Mot nhan su co it nhat mot dong gio cong DA DUYET — nguon danh sach "Chon nhan su" khi Ke
 * toan/Quan tri vien tra don gia cho mot dong gio cong (NCL-07-CN-005). Chon nhan su xong,
 * frontend goi tiep {@code /timesheet-entries/lookup-candidates?userId=} de lay cac dong gio
 * cong da duyet cua chinh nguoi nay, va tu dien san {@code level} vao form tra cuu.
 *
 * @param userId   ma nhan su.
 * @param fullName ho ten, hien trong danh sach chon.
 * @param level    cap bac hien tai trong ho so nhan su — {@code null} neu chua khai bao, khi
 *                 do frontend de trong o form tra cuu de nguoi dung tu chon.
 */
public record TimeEntryLookupEmployeeRes(Long userId, String fullName, String level) {
}
