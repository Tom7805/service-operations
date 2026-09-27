package com.serviceops.modules.identity.preference.dto.request;

import com.serviceops.modules.identity.preference.enums.DisplayDensity;
import com.serviceops.modules.identity.preference.enums.ThemeMode;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Ghi de toan bo tuy chon giao dien cua nguoi dung hien tai. */
public record UserPreferenceReq(
		@NotNull(message = "Chu de khong duoc de trong") ThemeMode theme,
		@NotNull(message = "Mat do hien thi khong duoc de trong") DisplayDensity density,
		@Size(max = 40, message = "Ma man hinh mo dau toi da 40 ky tu")
		@Pattern(regexp = "^[A-Z_]*$", message = "Ma man hinh mo dau khong hop le") String landingTab,
		@NotNull(message = "Trang thai thanh ben khong duoc de trong") Boolean sidebarCollapsed,
		@NotNull(message = "Tuy chon giam hieu ung khong duoc de trong") Boolean reduceMotion
) {}
