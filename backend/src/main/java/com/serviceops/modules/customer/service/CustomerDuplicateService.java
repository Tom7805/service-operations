package com.serviceops.modules.customer.service;

import com.serviceops.modules.customer.dto.response.DuplicateCandidateRes;

import java.util.List;

/**
 * Chong trung ho so khach hang (NCL-02-CN-002).
 *
 * <p>So khop gan dung theo ten, ma so thue va so dien thoai de de xuat danh sach
 * ho so nghi trung ke kem muc do giong nhau (TC-01). Quyet dinh co chan luu hay
 * khong (nguong giong cao, TC-01) thuoc ve {@link com.serviceops.modules.customer.validator.CustomerDuplicateValidator} —
 * service nay chi chiu trach nhiem tinh diem giong nhau, khong tu quyet dinh chan.</p>
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
}
