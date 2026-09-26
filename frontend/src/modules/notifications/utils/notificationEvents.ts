/**
 * Sự kiện toàn cục báo "số thông báo chưa đọc có thể đã đổi" — App lắng nghe để gọi lại
 * GET /notifications/unread-count ngay, không chờ lần làm mới định kỳ 30 giây. Dùng sau các
 * thao tác sinh thông báo tức thì, vd duyệt bảng chấm công làm vượt ngân sách công việc
 * (NCL-14-CN-003 — cảnh báo gửi ngay sau khi giao dịch duyệt commit).
 */
export const NOTIFICATIONS_CHANGED_EVENT = 'notifications:changed';

export function notifyNotificationsChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}
