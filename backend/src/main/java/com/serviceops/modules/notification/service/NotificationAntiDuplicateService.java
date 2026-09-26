package com.serviceops.modules.notification.service;

import com.serviceops.modules.notification.enums.NotificationType;

import java.util.List;
import java.util.Set;

/**
 * Chong gui trung thong bao cho cac su kien duoc tac vu nen ra soat dinh ky (NCL-14-CN-003,
 * QTN-27) — khac voi {@link NotificationDeduplicationService} (chi dung rieng cho
 * {@code NotificationDigestServiceImpl} gop ban tong hop, NCL-14-CN-002). KHONG ap dung cho
 * margin alert/timesheet reminder/dunning — 3 module do da co co che chong trung rieng va van
 * giu nguyen (khong bi thay the boi service nay).
 */
public interface NotificationAntiDuplicateService {

	/**
	 * Loai su kien thuc su di qua co che chong trung theo dot canh bao (episode) nay — dung de
	 * {@code NotificationDedupConfigService} gioi han danh sach hien thi/cho phep sua cho Admin,
	 * tranh hien thi cau hinh cho nhung loai ma sua vao khong co tac dung gi (margin
	 * alert/timesheet reminder/dunning van dung co che rieng, khong doc cau hinh nay).
	 */
	Set<NotificationType> supportedEventTypes();

	/**
	 * Goi moi lan tac vu ra soat kiem tra lai mot ban ghi.
	 *
	 * @param eventType loai su kien ra soat (vi du TASK_BUDGET_EXCEEDED)
	 * @param referenceId ban ghi lien quan (vi du taskId) dang duoc ra soat
	 * @param candidateRecipientIds nhung nguoi co the can nhan canh bao nay
	 * @param breached true neu lan ra soat nay ban ghi dang o trang thai can canh bao (vi du dang
	 *                 vuot nguong); false neu da tro lai binh thuong
	 * @return danh sach recipientId THUC SU can gui — da loc nhung nguoi da nhan roi trong cung
	 *         dot canh bao (TC-01); rong neu breached = false hoac tat ca da nhan roi
	 */
	List<Long> resolveRecipientsToNotify(NotificationType eventType, Long referenceId,
			List<Long> candidateRecipientIds, boolean breached);

	/**
	 * NCL-14-CN-003 CV-02: noi ket qua chong trung voi dich vu gui thong bao — goi
	 * {@code NotificationService.sendInAppNotification} cho dung nhung nguoi duoc
	 * {@link #resolveRecipientsToNotify} duyet, bo qua nhung nguoi da nhan roi trong cung dot
	 * canh bao (TC-01).
	 *
	 * @return danh sach recipientId da thuc su duoc gui (giong ket qua cua resolveRecipientsToNotify)
	 */
	List<Long> evaluateAndNotify(NotificationType eventType, Long referenceId, List<Long> candidateRecipientIds,
			boolean breached, String title, String content);
}
