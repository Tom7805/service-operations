package com.serviceops.modules.identity.preference.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.identity.preference.dto.request.UserPreferenceReq;
import com.serviceops.modules.identity.preference.dto.response.UserPreferenceRes;
import com.serviceops.modules.identity.preference.service.UserPreferenceService;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tuy chon giao dien cua nguoi dung hien tai (Cai dat - Giao dien). Moi vai tro da dang nhap deu dung
 * duoc; userId luon lay tu phien dang nhap ({@link CurrentUserScopeProvider}), khong nhan tu client.
 */
@RestController
@RequiredArgsConstructor
public class UserPreferenceController {

	private final UserPreferenceService userPreferenceService;
	private final CurrentUserScopeProvider currentUserScopeProvider;

	@GetMapping("/me/preferences")
	public BaseRes<UserPreferenceRes> get() {
		return BaseRes.ok(userPreferenceService.get(currentUserScopeProvider.currentUserId()));
	}

	@PutMapping("/me/preferences")
	public BaseRes<UserPreferenceRes> update(@Valid @RequestBody UserPreferenceReq request) {
		return BaseRes.ok("Da luu tuy chon giao dien",
				userPreferenceService.update(currentUserScopeProvider.currentUserId(), request));
	}
}
