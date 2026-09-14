package com.serviceops.modules.customer.dto.response;

/**
 * Xem truoc anh huong khi gop hai ho so khach hang trung (NCL-02-CN-006).
 * Khong lam thay doi du lieu - chi doc de nguoi dung xac nhan truoc khi gop that.
 *
 * @param targetCustomer      ho so se duoc giu lai (nhan du lieu).
 * @param sourceCustomer      ho so se bi gop (chuyen sang da gop sau khi xac nhan gop).
 * @param relatedRecordCount  so ban ghi lien quan cua ho so bi gop (nhat ky khach hang, ly do bo qua
 *                            canh bao trung) se duoc chuyen ve ho so giu lai.
 */
public record MergePreviewRes(
        CustomerRes targetCustomer,
        CustomerRes sourceCustomer,
        long relatedRecordCount
) {}
