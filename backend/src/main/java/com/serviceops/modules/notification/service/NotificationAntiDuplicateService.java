package com.serviceops.modules.notification.service;

import com.serviceops.modules.notification.enums.NotificationType;

import java.util.List;

/**
 * Chong gui trung thong bao cho cac su kien duoc tac vu nen ra soat dinh ky (NCL-14-CN-003,
 * QTN-27) — khac voi {@link NotificationDeduplicationService} (chi dung rieng cho
 * {@code NotificationDigestServiceImpl} gop ban tong hop, NCL-14-CN-002). KHONG ap dung cho
 * margin alert/timesheet reminder/dunning — 3 module do da co co che chong trung rieng va van
 * giu nguyen (khong bi thay the boi service nay).
 */
public interface NotificationAntiDuplicateService {

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
}
