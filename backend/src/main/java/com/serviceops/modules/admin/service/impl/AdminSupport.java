package com.serviceops.modules.admin.service.impl;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Tien ich dung chung cho cac service cua Epic NCL-15. */
final class AdminSupport {

	private AdminSupport() {
	}

	/** Ten dang nhap cua nguoi dang thao tac; {@code null} khi chay tu tac vu nen (sao luu theo lich). */
	static String currentUsername() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication == null ? null : authentication.getName();
	}

	static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}
}
