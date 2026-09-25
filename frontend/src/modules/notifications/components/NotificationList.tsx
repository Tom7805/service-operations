import type { ReactNode } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { NotificationRes, NotificationType } from '../types/notificationTypes';

interface NotificationListProps {
  notifications: NotificationRes[];
  onMarkRead: (notification: NotificationRes) => void;
}

const TYPE_ICON: Record<NotificationType, ReactNode> = {
  TIMESHEET_SUBMITTED: ICONS.checkCircle,
  TIMESHEET_REJECTED: ICONS.alertTriangle,
  TIMER_AUTO_STOPPED: ICONS.clock,
  TIMESHEET_REMINDER: ICONS.clock,
  EXPENSE_SUBMITTED: ICONS.money,
  PROJECT_MILESTONE_DUE: ICONS.target,
  CONTRACT_EXPIRING: ICONS.receipt,
  NEGATIVE_MARGIN_ALERT: ICONS.alertTriangle,
  INVOICE_PROPOSAL_CREATED: ICONS.receipt,
  DUNNING_REMINDER: ICONS.alertTriangle,
  RECURRING_INVOICE_GENERATED: ICONS.receipt,
  ACCEPTANCE_DECIDED_ON_PORTAL: ICONS.checkCircle,
};

/** Hiển thị tương đối kiểu "5 phút trước" / "Hôm qua" cho gần, còn lại dùng ngày giờ đầy đủ. */
function formatRelative(sentAt: string): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) return sentAt;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Hôm qua';
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

/**
 * Danh sách thông báo in-app dùng chung cho ô chuông thả xuống (App.tsx) và trang
 * "Thông báo" đầy đủ (NotificationCenterPage) — bấm vào một dòng chưa đọc sẽ đánh dấu đã đọc.
 */
export default function NotificationList({ notifications, onMarkRead }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="notif-panel__empty">
        <span className="notif-panel__empty-icon">{ICONS.bell}</span>
        <p>Chưa có thông báo nào</p>
      </div>
    );
  }

  return (
    <div className="notif-panel__list">
      {notifications.map((n) => (
        <button
          key={n.id}
          type="button"
          className={`notif-panel__row ia-notif-row${n.isRead ? ' ia-notif-row--read' : ''}`}
          onClick={() => !n.isRead && onMarkRead(n)}
          data-testid={`notification-row-${n.id}`}
          data-read={n.isRead}
        >
          <span className={`notif-panel__row-icon ${n.isRead ? 'notif-panel__row-icon--muted' : ''}`}>
            {TYPE_ICON[n.type] ?? ICONS.bell}
          </span>
          <span className="notif-panel__row-body">
            <span className="notif-panel__row-title">{n.title}</span>
            <div className="notif-panel__row-sub">{n.content}</div>
          </span>
          <span className="notif-panel__row-time">{formatRelative(n.sentAt)}</span>
        </button>
      ))}
    </div>
  );
}
