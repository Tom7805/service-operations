package com.serviceops.modules.portal.dto.response;

import com.serviceops.modules.customer.enums.ContactRole;
import com.serviceops.modules.identity.user.enums.UserStatus;

import java.time.LocalDateTime;

/**
 * Tai khoan cong khach hang (NCL-13-CN-001) — cho man hinh quan tri, khong tra cho khach hang.
 *
 * @param status trang thai dang nhap doc tu tai khoan ({@code users.status}): ACTIVE hoac LOCKED
 */
public record PortalAccountRes(
		Long id,
		Long userId,
		String username,
		String fullName,
		String email,
		UserStatus status,
		Long customerId,
		String customerCode,
		String customerName,
		Long contactId,
		String contactName,
		String contactTitle,
		ContactRole contactRole,
		String statusReason,
		String statusChangedBy,
		LocalDateTime statusChangedAt,
		String createdBy,
		LocalDateTime createdAt) {
}
