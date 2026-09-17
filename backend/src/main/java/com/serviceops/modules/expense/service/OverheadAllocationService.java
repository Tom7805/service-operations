package com.serviceops.modules.expense.service;

import com.serviceops.modules.expense.dto.request.OverheadAllocationRunReq;
import com.serviceops.modules.expense.dto.response.OverheadAllocationRes;

/**
 * NCL-08-CN-005: phan bo chi phi chung cho cac du an theo ty trong gio cong da duyet
 * trong ky (QTN-29).
 */
public interface OverheadAllocationService {

	/**
	 * Chay phan bo chi phi chung cho ky {@code year}/{@code month}. Chi cac du an co gio
	 * cong da duyet trong ky moi nhan duoc mot phan (du an khong phat sinh gio cong trong
	 * ky se khong xuat hien trong ket qua — TC-02).
	 */
	OverheadAllocationRes run(OverheadAllocationRunReq request);
}
