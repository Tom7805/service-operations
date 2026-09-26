package com.serviceops.modules.notification.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.notification.dto.request.NotificationDedupConfigReq;
import com.serviceops.modules.notification.dto.response.NotificationDedupConfigRes;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationDedupConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Cau hinh chong gui trung thong bao theo loai su kien (NCL-14-CN-003, QTN-27).
 *
 * <p>TC-03: chi Quan tri vien (VT-07) duoc mo chuc nang nay; vai tro khac nhan 403
 * (AccessDeniedAuditRecorder tu ghi log tu choi truy cap).</p>
 */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasRole('VT-07')")
public class NotificationDedupConfigController {

	private final NotificationDedupConfigService notificationDedupConfigService;

	@GetMapping("/notifications/dedup-configs")
	public BaseRes<List<NotificationDedupConfigRes>> get() {
		return BaseRes.ok(notificationDedupConfigService.getConfigs());
	}

	@PutMapping("/notifications/dedup-configs/{eventType}")
	public BaseRes<Void> update(@PathVariable NotificationType eventType,
			@Valid @RequestBody NotificationDedupConfigReq request) {
		notificationDedupConfigService.updateConfig(eventType, request);
		return BaseRes.ok("Da luu cau hinh chong gui trung thong bao", null);
	}
}
