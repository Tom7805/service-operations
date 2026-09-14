package com.serviceops.modules.contract.service;

import com.serviceops.modules.contract.dto.response.ContractExpiryAlertRes;

import java.util.List;

/**
 * NCL-04-CN-006: Nhac hop dong sap het hieu luc.
 */
public interface ContractExpiryReminderService {

	/**
	 * Danh sach hop dong dang hieu luc (ACTIVE) can Ke toan chu y, gom hai
	 * nhom gop lai va sap theo ngay ket thuc tang dan:
	 * <ul>
	 *   <li>Da het han tren giay to nhung van o trang thai ACTIVE (chua duoc
	 *       gia han hay dong lai) - {@code daysRemaining} am, luon co mat bat
	 *       ke {@code withinDays} la bao nhieu, vi day la truong hop khan cap
	 *       can xu ly ngay (TC-02).</li>
	 *   <li>Con hieu luc va se het han trong vong {@code withinDays} ngay ke
	 *       tu hom nay - {@code daysRemaining} tu 0 tro len (TC-01).</li>
	 * </ul>
	 * Hop dong khong khai bao ngay ket thuc khong nam trong danh sach nay.
	 */
	List<ContractExpiryAlertRes> findExpiringSoon(int withinDays);
}
