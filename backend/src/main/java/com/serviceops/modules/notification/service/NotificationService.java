package com.serviceops.modules.notification.service;

import com.serviceops.modules.notification.dto.response.NotificationRes;
import com.serviceops.modules.notification.enums.NotificationGroup;
import com.serviceops.modules.notification.enums.NotificationType;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationService {

	void sendInAppNotification(Long recipientId, NotificationType type, String title, String content, Long referenceId, String referenceType);

	List<NotificationRes> getUnreadNotifications(Long recipientId);

	List<NotificationRes> listNotifications(Long recipientId, boolean unreadOnly, Pageable pageable);

	/** NCL-14-CN-001: nhu tren, loc them theo nhom thong bao ({@code group = null} = khong loc). */
	List<NotificationRes> listNotifications(Long recipientId, boolean unreadOnly, NotificationGroup group,
			Pageable pageable);

	void markAsRead(Long recipientId, List<Long> notificationIds);

	/** NCL-14-CN-001: danh dau tat ca thong bao chua doc cua chinh minh la da doc; tra ve so thong bao da doi. */
	int markAllAsRead(Long recipientId);

	long getUnreadCount(Long recipientId);

	/**
	 * Mo mot thong bao cu the cua chinh minh (NCL-14-CN-001 TC-02): danh dau da doc neu chua doc
	 * va tra ve du lieu (kem referenceId/targetType) de FE dieu huong toi ban ghi lien quan.
	 * Nem loi khong tim thay neu thong bao khong ton tai hoac khong thuoc ve recipientId.
	 *
	 * <p><b>Rule 3/4 (khong re-check quyen tren ban ghi duoc tham chieu):</b> method nay CHI xac
	 * nhan quyen so huu thong bao, khong goi sang module khac (project/invoice/acceptance...) de
	 * kiem tra nguoi dung con quyen xem ban ghi duoc referenceId tro toi hay khong — vi moi module
	 * dich da tu bat buoc kiem tra quyen tren chinh API chi tiet cua no (qua
	 * {@code CurrentUserScopeProvider}/scope rieng), nen khong can lam lai o day. Neu ban ghi da bi
	 * xoa hoac nguoi dung khong con quyen, loi 403/404 se den tu chinh API do khi FE goi tiep — FE
	 * chiu trach nhiem hien thi thong bao loi tuong ung; thong bao trong trung tam van duoc danh
	 * dau da doc du sau do co mo duoc ban ghi hay khong.</p>
	 */
	NotificationRes openNotification(Long recipientId, Long notificationId);
}