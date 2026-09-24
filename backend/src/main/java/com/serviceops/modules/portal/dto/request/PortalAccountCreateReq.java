package com.serviceops.modules.portal.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * NCL-13-CN-001 (TC-01): Quan tri vien cap tai khoan cong cho mot nguoi lien he. Khach hang cua tai
 * khoan suy ra tu nguoi lien he — khong nhan {@code customerId} tu client de khong the gan lech.
 */
public record PortalAccountCreateReq(
		@NotNull(message = "Phai chon nguoi lien he duoc cap tai khoan") Long contactId,
		@NotBlank(message = "Ten dang nhap khong duoc de trong")
		@Pattern(regexp = "^[A-Za-z0-9._@-]{3,100}$",
				message = "Ten dang nhap dai 3-100 ky tu, chi gom chu, so va cac ky tu . _ @ -") String username,
		@NotBlank(message = "Mat khau khong duoc de trong")
		@Size(min = 8, max = 100, message = "Mat khau phai co tu 8 den 100 ky tu") String password) {
}
