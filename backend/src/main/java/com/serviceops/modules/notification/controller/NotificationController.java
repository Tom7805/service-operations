package com.serviceops.modules.notification.controller;

import com.serviceops.common.api.BaseRes;
import com.serviceops.modules.notification.dto.request.NotificationMarkReadReq;
import com.serviceops.modules.notification.dto.response.NotificationRes;
import com.serviceops.modules.notification.service.NotificationService;
import com.serviceops.security.scope.CurrentUserScopeProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * API thong bao in-app cua nguoi dung hien tai (NCL-06-CN-002).
 *
 * <p>Chi tra ve/thao tac tren thong bao cua chinh minh — recipientId luon lay
 * tu {@link CurrentUserScopeProvider}, khong nhan tu client.</p>
 */
@RestController
@RequiredArgsConstructor
public class NotificationController {

	private final NotificationService notificationService;
	private final CurrentUserScopeProvider currentUserScopeProvider;

	@GetMapping("/notifications")
	public BaseRes<List<NotificationRes>> list(
			@RequestParam(defaultValue = "false") boolean unreadOnly,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "sentAt"));
		return BaseRes.ok(notificationService.listNotifications(
				currentUserScopeProvider.currentUserId(), unreadOnly, pageable));
	}

	@GetMapping("/notifications/unread-count")
	public BaseRes<Long> unreadCount() {
		return BaseRes.ok(notificationService.getUnreadCount(currentUserScopeProvider.currentUserId()));
	}

	@PostMapping("/notifications/read")
	public BaseRes<Void> markAsRead(@Valid @RequestBody NotificationMarkReadReq request) {
		notificationService.markAsRead(currentUserScopeProvider.currentUserId(), request.notificationIds());
		return BaseRes.ok("Da danh dau da doc", null);
	}

	/**
	 * Mo mot thong bao cu the (NCL-14-CN-001 TC-02) — danh dau da doc va tra ve
	 * referenceId/referenceType de FE dieu huong thang toi ban ghi lien quan.
	 */
	@PostMapping("/notifications/{id}/open")
	public BaseRes<NotificationRes> open(@PathVariable("id") Long id) {
		return BaseRes.ok(notificationService.openNotification(currentUserScopeProvider.currentUserId(), id));
	}
}
