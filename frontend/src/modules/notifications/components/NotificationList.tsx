import type { ReactNode } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { NotificationRes, NotificationSeverity, NotificationType } from '../types/notificationTypes';
import { hasNotificationTarget } from '../utils/notificationTarget';

interface NotificationListProps {
  notifications: NotificationRes[];
  /**
   * Bấm vào một dòng thông báo (NCL-14-CN-001 TC-02): mở thẳng tới bản ghi liên quan và đánh dấu
   * đã đọc. Gọi cho cả thông báo đã đọc — người dùng vẫn cần mở lại được bản ghi để tra cứu.
   */
  onOpen: (notification: NotificationRes) => void;
  /** Đánh dấu đã đọc mà không rời trang hiện tại. Bỏ trống thì không hiện nút trên từng dòng. */
  onMarkRead?: (notification: NotificationRes) => void;
  /** Id thông báo đang được mở — khóa dòng đó tránh bấm liên tiếp gọi API nhiều lần. */
  openingId?: number | null;
  /** Nội dung khi danh sách trống (vd khác nhau giữa "Tất cả" và "Chưa đọc"). */
  emptyText?: string;
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
  DAILY_DIGEST_SUMMARY: ICONS.bell,
  TASK_BUDGET_EXCEEDED: ICONS.hourglass,
  SECURITY_ALERT: ICONS.shield,
};

export const SEVERITY_LABEL: Record<NotificationSeverity, string> = {
  CRITICAL: 'Nghiêm trọng',
  WARNING: 'Cảnh báo',
  INFO: 'Thông tin',
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

function formatFull(sentAt: string): string {
  const date = new Date(sentAt);
  return Number.isNaN(date.getTime()) ? sentAt : date.toLocaleString('vi-VN');
}

/**
 * Danh sách thông báo in-app dùng chung cho ô chuông thả xuống (App.tsx) và trang
 * "Thông báo" đầy đủ (NotificationCenterPage). Mỗi dòng thể hiện mức độ (đỏ/vàng/xám),
 * dấu chưa đọc, và bấm vào là mở bản ghi liên quan (NCL-14-CN-001).
 */
export default function NotificationList({
  notifications,
  onOpen,
  onMarkRead,
  openingId = null,
  emptyText = 'Chưa có thông báo nào',
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="notif-panel__empty" data-testid="notification-empty">
        <span className="notif-panel__empty-icon">{ICONS.bell}</span>
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="notif-panel__list" aria-label="Danh sách thông báo">
      {notifications.map((n) => {
        const severity: NotificationSeverity = n.severity ?? 'INFO';
        const opening = openingId === n.id;
        const hasTarget = hasNotificationTarget(n);
        return (
          <li
            key={n.id}
            className={`notif-row notif-row--${severity.toLowerCase()} ${n.isRead ? '' : 'notif-row--unread'}`}
            data-severity={severity}
          >
            <button
              type="button"
              className="notif-row__main"
              onClick={() => onOpen(n)}
              disabled={opening}
              aria-busy={opening}
              aria-label={`${n.isRead ? '' : 'Chưa đọc. '}${SEVERITY_LABEL[severity]}: ${n.title}`}
              data-testid={`notification-row-${n.id}`}
              data-read={n.isRead}
            >
              <span className={`notif-row__icon notif-row__icon--${severity.toLowerCase()}`} aria-hidden="true">
                {TYPE_ICON[n.type] ?? ICONS.bell}
              </span>
              <span className="notif-row__body">
                <span className="notif-row__title-line">
                  <span className="notif-row__title">{n.title}</span>
                  <span className={`notif-sev notif-sev--${severity.toLowerCase()}`}>{SEVERITY_LABEL[severity]}</span>
                </span>
                <span className="notif-row__content">{n.content}</span>
                <span className="notif-row__meta">
                  <time dateTime={n.sentAt} title={formatFull(n.sentAt)}>
                    {formatRelative(n.sentAt)}
                  </time>
                  {hasTarget && (
                    <span className="notif-row__goto">
                      {opening ? 'Đang mở…' : 'Mở bản ghi liên quan'} {ICONS.arrowRight}
                    </span>
                  )}
                </span>
              </span>
              {!n.isRead && <span className="notif-row__dot" data-testid={`notification-unread-dot-${n.id}`} aria-hidden="true" />}
            </button>
            {onMarkRead && !n.isRead && (
              <button
                type="button"
                className="notif-row__mark"
                onClick={() => onMarkRead(n)}
                disabled={opening}
                title="Đánh dấu đã đọc"
                aria-label={`Đánh dấu đã đọc: ${n.title}`}
                data-testid={`btn-mark-read-${n.id}`}
              >
                {ICONS.check}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
