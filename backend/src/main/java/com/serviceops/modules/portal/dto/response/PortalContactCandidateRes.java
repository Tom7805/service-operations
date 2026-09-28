package com.serviceops.modules.portal.dto.response;

import com.serviceops.modules.customer.enums.ContactRole;
import com.serviceops.modules.identity.user.enums.UserStatus;

/**
 * NCL-13-CN-001: mot nguoi lien he cua khach hang kem tai khoan cong (neu da cap) — de Quan tri vien chon nguoi
 * duoc cap tai khoan. Can endpoint rieng vi danh sach nguoi lien he cua NCL-02-CN-003 chi danh cho Nhan vien kinh
 * doanh (TC-03 cua story do).
 *
 * @param portalAccountId null neu nguoi lien he chua co tai khoan cong
 */
public record PortalContactCandidateRes(
		Long contactId,
		String fullName,
		String title,
		String email,
		ContactRole role,
		Long portalAccountId,
		String portalUsername,
		UserStatus portalStatus) {
}
