package com.serviceops.modules.identity.auth.service.impl;

import com.serviceops.common.audit.AuditTargetType;
import com.serviceops.common.audit.service.AuditLogService;
import com.serviceops.modules.identity.user.repository.UserRoleScopeRepository;
import com.serviceops.modules.notification.enums.NotificationType;
import com.serviceops.modules.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;

/**
 * Canh bao quan tri vien (VT-07) khi mot tai khoan bi tam khoa do nhap sai ma xac thuc hai buoc qua so
 * lan cho phep (NCL-01-CN-009-TC-02): gui thong bao trong he thong toi MOI quan tri vien va ghi mot dong
 * vao Nhat ky he thong.
 *
 * <p>Duoc goi SAU khi giao dich xac thuc OTP da commit (xem {@link TwoFactorServiceImpl#verifyTwoFactor})
 * va nuot moi loi — su co gui canh bao khong duoc lam thay doi phan hoi tra ve cho nguoi dang nhap.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SecurityAlertNotifier {

	static final String ADMIN_ROLE = "VT-07";

	private final UserRoleScopeRepository userRoleScopeRepository;
	private final NotificationService notificationService;
	private final AuditLogService auditLogService;

	public void alertTwoFactorLock(Long lockedUserId, String lockedUsername, long lockSeconds) {
		String title = "Cảnh báo bảo mật: tài khoản bị tạm khóa";
		String content = "Tài khoản @" + lockedUsername + " vừa nhập sai mã xác thực hai bước quá số lần cho phép "
				+ "và đã bị tạm khóa " + Math.max(1, lockSeconds / 60) + " phút. Hãy kiểm tra nếu đây không phải "
				+ "thao tác của chính chủ tài khoản.";
		try {
			List<Long> adminIds = List.copyOf(new LinkedHashSet<>(userRoleScopeRepository.findUserIdsByRoleCode(ADMIN_ROLE)));
			for (Long adminId : adminIds) {
				notificationService.sendInAppNotification(adminId, NotificationType.SECURITY_ALERT, title, content,
						lockedUserId, "User");
			}
			auditLogService.recordAs(lockedUserId, lockedUsername, "Tạm khóa do sai mã xác thực hai bước",
					AuditTargetType.TWO_FACTOR, lockedUserId, lockedUsername,
					"Nhập sai mã xác thực hai bước quá số lần cho phép; đã cảnh báo " + adminIds.size() + " quản trị viên.");
		} catch (RuntimeException ex) {
			log.error("SECURITY_ALERT_FAILED userId={} nguyenNhan={}", lockedUserId, ex.getMessage());
		}
	}
}
