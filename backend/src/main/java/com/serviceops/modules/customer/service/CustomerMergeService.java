package com.serviceops.modules.customer.service;

import com.serviceops.modules.customer.dto.request.CustomerMergeReq;
import com.serviceops.modules.customer.dto.response.CustomerRes;
import com.serviceops.modules.customer.dto.response.MergePreviewRes;

/**
 * Gop hai ho so khach hang trung thanh mot (NCL-02-CN-006, QTN-05).
 *
 * <p>Ho so "giu lai" ({@code targetCustomerId}) nhan toan bo du lieu lien quan cua
 * ho so "bi gop" ({@code sourceCustomerId}). Sau khi gop, ho so bi gop chuyen sang
 * trang thai {@code MERGED} va khong con dung duoc cho cac thao tac nghiep vu khac
 * (tao co hoi, hop dong, ...). Thao tac nay chi danh cho Quan tri vien (VT-07).</p>
 */
public interface CustomerMergeService {

    /**
     * Xem truoc anh huong truoc khi gop that - khong thay doi du lieu.
     */
    MergePreviewRes preview(CustomerMergeReq request);

    /**
     * Thuc hien gop hai ho so (TC-01). Van gop ngay ca khi ho so bi gop dang co
     * du lieu lien quan chua xu ly xong (vi du cong no chua thanh toan) - du lieu
     * do duoc chuyen ve ho so giu lai va van giu duoc dau vet nguon goc (TC-02).
     *
     * @return ho so "giu lai" sau khi da nhan du lieu tu ho so bi gop.
     */
    CustomerRes merge(CustomerMergeReq request);
}
