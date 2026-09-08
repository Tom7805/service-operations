package com.serviceops.modules.contract.dto.response;

import java.time.LocalDate;

/**
 * Mot canh bao hop dong lien quan toi hieu luc tra ve cho FE (NCL-04-CN-006).
 *
 * @param daysRemaining So ngay con lai toi ngay ket thuc; am neu da qua han (alertType {@code OVERDUE_ACTIVE}).
 * @param createdBy     Nguoi phu trach hop dong (nguoi tao) - nhan ban sao nhac cung ke toan.
 * @param alertType     {@code EXPIRING_SOON} (sap het hieu luc, TC-01) hoac {@code OVERDUE_ACTIVE}
 *                      (da het hieu luc nhung hop dong van dang ACTIVE, TC-02).
 */
public record ContractExpiryAlertRes(
		Long contractId,
		String contractCode,
		String name,
		Long customerId,
		LocalDate endDate,
		long daysRemaining,
		String status,
		String createdBy,
		String alertType
) {}
