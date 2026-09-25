package com.serviceops.modules.notification.service;

import com.serviceops.modules.notification.dto.request.NotificationPreferenceReq;
import com.serviceops.modules.notification.dto.response.NotificationPreferenceRes;
import com.serviceops.modules.notification.enums.NotificationGroup;

import java.util.List;

public interface NotificationPreferenceService {

	/** Tra ve cau hinh cho toan bo {@link NotificationGroup}, dien mac dinh (bat + IMMEDIATE)
	 * cho nhung nhom nguoi dung chua tung cau hinh. */
	List<NotificationPreferenceRes> getPreferences(Long userId);

	/** Ghi lai cau hinh moi va audit log nguoi thuc hien/thoi diem (TC-03). */
	void updatePreferences(Long userId, NotificationPreferenceReq request);

	/** Dung boi {@code NotificationDispatcher} de quyet dinh gui ngay/gop/bo qua — tra ve mac
	 * dinh (bat, IMMEDIATE) neu user chua tung cau hinh nhom nay. */
	NotificationPreferenceRes resolve(Long userId, NotificationGroup notificationGroup);
}
