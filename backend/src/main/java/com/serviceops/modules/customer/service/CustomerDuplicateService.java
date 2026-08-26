package com.serviceops.modules.customer.service;

import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;

import java.util.List;

/**
 * Chong trung ho so khach hang (NCL-02-CN-002).
 *
 * <p>So khop gan dung theo ten, ma so thue va so dien thoai de de xuat danh sach
 * ho so nghi trung ke kem muc do giong nhau (TC-01). Luc co uoi trung manh
 * (vi du cung ma so thue) thi chan luu (TC-01) tru khi nguoi dung xac nhan
 * tao moi kem ly do (TC-02).</p>
 */
public interface CustomerDuplicateService {

    /**
     * Tim danh sach ho so khach hang nghi trung so voi ho so moi.
     *
     * @param name    ten cong ty can kiem tra.
     * @param taxCode ma so thue can kiem tra.
     * @param phone   so dien thoai can kiem tra.
     * @return danh sach ho so nghi trung, giam dan theo muc do giong nhau.
     */
    List<DuplicateCandidateRes> findDuplicates(String name, String taxCode, String phone);

    /**
     * Kiem tra co ton tai ho so bi chan khong (muc do giong nhau cao, vi du cung ma so thue).
     *
     * @param candidates danh sach ho so nghi trung da tinh ({@link #findDuplicates}).
     * @throws com.serviceops.common.exception.BusinessRuleException khi co ho so chan (TC-01).
     */
    void assertNoBlockingDuplicate(List<DuplicateCandidateRes> candidates);
}
