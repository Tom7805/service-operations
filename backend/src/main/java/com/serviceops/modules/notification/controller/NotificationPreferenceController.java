package com.serviceops.modules.notification.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.notification.dto.request.NotificationPreferenceReq;
import com.serviceops.modules.notification.dto.response.NotificationPreferenceRes;
import com.serviceops.modules.notification.service.NotificationPreferenceService;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Cau hinh nhan thong bao theo nhom va tan suat cua nguoi dung hien tai (NCL-14-CN-002).
 *
 * <p>Chi tra ve/thao tac tren cau hinh cua chinh minh — userId luon lay tu
 * {@link CurrentUserScopeProvider}, khong nhan tu client.</p>
 */
@RestController
@RequiredArgsConstructor
public class NotificationPreferenceController {

	private final NotificationPreferenceService notificationPreferenceService;
	private final CurrentUserScopeProvider currentUserScopeProvider;

	@GetMapping("/notifications/preferences")
	public BaseRes<List<NotificationPreferenceRes>> get() {
		return BaseRes.ok(notificationPreferenceService.getPreferences(currentUserScopeProvider.currentUserId()));
	}

	@PutMapping("/notifications/preferences")
	public BaseRes<Void> update(@Valid @RequestBody NotificationPreferenceReq request) {
		notificationPreferenceService.updatePreferences(currentUserScopeProvider.currentUserId(), request);
		return BaseRes.ok("Da luu cau hinh nhan thong bao", null);
	}
}
