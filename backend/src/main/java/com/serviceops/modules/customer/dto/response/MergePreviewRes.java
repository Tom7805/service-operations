package com.serviceops.modules.customer.dto.response;

import java.util.Map;

/**
 * Xem truoc anh huong khi gop hai ho so khach hang trung (NCL-02-CN-006).
 * Khong lam thay doi du lieu - chi doc de nguoi dung xac nhan truoc khi gop that.
 *
 * @param targetCustomer          ho so se duoc giu lai (nhan du lieu).
 * @param sourceCustomer          ho so se bi gop (chuyen sang da gop sau khi xac nhan gop).
 * @param relatedRecordCount      tong so ban ghi lien quan cua ho so bi gop se duoc chuyen ve ho so giu lai.
 * @param relatedRecordBreakdown  so ban ghi theo tung loai (co hoi, hop dong, du an, hoa don, de nghi xuat hoa
 *                                don, nhat ky khach hang, nhat ky bo qua canh bao trung) - de nguoi dung thay ro
 *                                se chuyen nhung gi (TC-01).
 */
public record MergePreviewRes(
        CustomerRes targetCustomer,
        CustomerRes sourceCustomer,
        long relatedRecordCount,
        Map<String, Long> relatedRecordBreakdown
) {}
