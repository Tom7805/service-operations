package com.serviceops.modules.invoice.service;

import com.serviceops.modules.invoice.dto.response.ReceivableAgingRes;
import com.serviceops.modules.invoice.enums.AgingBucket;

/** Theo doi cong no qua han (NCL-10-CN-004) — chi doc, khong doi du lieu. */
public interface ReceivableService {

	/**
	 * Cong no qua han tinh tai ngay hien tai, nhom theo so ngay qua han.
	 *
	 * @param customerId chi lay hoa don cua khach hang nay; {@code null} = moi khach hang
	 * @param bucket     chi lay hoa don thuoc nhom tuoi no nay; {@code null} = moi nhom
	 */
	ReceivableAgingRes getOverdue(Long customerId, AgingBucket bucket);
}
