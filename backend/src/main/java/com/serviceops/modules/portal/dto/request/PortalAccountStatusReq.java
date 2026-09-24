package com.serviceops.modules.portal.dto.request;

import com.serviceops.modules.identity.user.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * NCL-13-CN-001 (TC-02): khoa ({@code LOCKED}) hoac mo lai ({@code ACTIVE}) tai khoan cong, vd khi nguoi
 * lien he nghi viec o phia khach hang. {@code INACTIVE} khong dung cho tai khoan cong.
 */
public record PortalAccountStatusReq(
		@NotNull(message = "Trang thai khong duoc de trong") UserStatus status,
		@Size(max = 500, message = "Ly do toi da 500 ky tu") String reason) {
}
