package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;

import java.util.List;

/**
 * NCL-04-CN-006: Nhac hop dong sap het hieu luc.
 */
public interface ContractExpiryReminderService {

	/**
	 * Danh sach hop dong dang hieu luc (ACTIVE) co ngay ket thuc trong vong
	 * {@code withinDays} ngay ke tu hom nay - dung cho Ke toan ra soat va gia
	 * han truoc han (TC-01). Hop dong khong khai bao ngay ket thuc khong nam
	 * trong danh sach nay.
	 */
	List<ContractExpiryAlertRes> findExpiringSoon(int withinDays);
}
