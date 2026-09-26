import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ICONS } from '../../../components/common/icons';
import NotificationList, { SEVERITY_LABEL } from '../components/NotificationList';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationsRead,
  NotificationsApiError,
  openNotification,
} from '../api/notificationsApi';
import type { NotificationGroup, NotificationRes, NotificationSeverity } from '../types/notificationTypes';

const PAGE_SIZE = 20;

export const GROUP_OPTIONS: { value: NotificationGroup; label: string }[] = [
  { value: 'TIMESHEET', label: 'Bảng chấm công' },
  { value: 'EXPENSE', label: 'Chi phí' },
  { value: 'PROJECT', label: 'Dự án' },
  { value: 'CONTRACT', label: 'Hợp đồng' },
  { value: 'INVOICE', label: 'Hóa đơn' },
  { value: 'ACCEPTANCE', label: 'Nghiệm thu' },
];

const SEVERITY_ORDER: NotificationSeverity[] = ['CRITICAL', 'WARNING', 'INFO'];

export interface NotificationCenterPageProps {
  /**
   * Gọi sau khi `POST /notifications/{id}/open` thành công — App điều hướng tới bản ghi liên
   * quan (NCL-14-CN-001 TC-02). Bỏ trống thì chỉ đánh dấu đã đọc, ở lại trang.
   */
  onNavigate?: (opened: NotificationRes) => void;
  /** Đồng bộ số trên chuông thông báo ở thanh trên cùng mỗi khi số chưa đọc thay đổi (TC-01). */
  onUnreadCountChange?: (count: number) => void;
  /** Mở màn cấu hình nhận thông báo (NCL-14-CN-002). Bỏ trống thì ẩn nút. */
  onOpenPreferences?: () => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof NotificationsApiError || err instanceof Error ? err.message : fallback;
}

/**
 * Trung tâm thông báo (NCL-14-CN-001) — mọi thông báo in-app của chính người dùng hiện tại, mới
 * nhất trước, phân loại theo mức độ và lọc theo nhóm. Bấm một thông báo là mở thẳng tới bản ghi
 * liên quan và đánh dấu đã đọc; mọi thao tác đọc/đánh dấu đều đi qua API để backend ghi nhật ký
 * người thực hiện, nội dung và thời điểm (TC-03).
 */
export default function NotificationCenterPage({
  onNavigate,
  onUnreadCountChange,
  onOpenPreferences,
}: NotificationCenterPageProps = {}) {
  const [notifications, setNotifications] = useState<NotificationRes[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [group, setGroup] = useState<NotificationGroup | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Số chưa đọc lấy từ GET /notifications/unread-count (TC-01), KHÔNG đếm từ trang đang hiển thị.
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onUnreadCountChangeRef = useRef(onUnreadCountChange);
  onUnreadCountChangeRef.current = onUnreadCountChange;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
      onUnreadCountChangeRef.current?.(count);
    } catch {
      // Không chặn trang chính khi chỉ lỗi phần đếm.
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(unreadOnly, page, PAGE_SIZE, group);
      setNotifications(data);
    } catch (err) {
      setError(errorMessage(err, 'Không thể tải danh sách thông báo.'));
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, page, group]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  const reloadAll = () => {
    void fetchNotifications();
    void refreshUnreadCount();
  };

  const applyRead = (ids: number[]) => {
    const set = new Set(ids);
    const now = new Date().toISOString();
    setNotifications((prev) =>
      unreadOnly
        ? prev.filter((n) => !set.has(n.id))
        : prev.map((n) => (set.has(n.id) && !n.isRead ? { ...n, isRead: true, readAt: now } : n))
    );
  };

  const handleOpen = async (notification: NotificationRes) => {
    if (openingId != null) return;
    setOpeningId(notification.id);
    try {
      const opened = await openNotification(notification.id);
      applyRead([notification.id]);
      void refreshUnreadCount();
      onNavigate?.(opened);
    } catch (err) {
      if (err instanceof NotificationsApiError && err.statusCode === 404) {
        showToast('Thông báo không còn tồn tại hoặc không thuộc về bạn. Danh sách đã được tải lại.', 'error');
        reloadAll();
      } else {
        showToast(errorMessage(err, 'Không thể mở thông báo.'), 'error');
      }
    } finally {
      setOpeningId(null);
    }
  };

  const handleMarkRead = async (notification: NotificationRes) => {
    applyRead([notification.id]);
    try {
      await markNotificationsRead([notification.id]);
      void refreshUnreadCount();
    } catch (err) {
      showToast(errorMessage(err, 'Không thể đánh dấu đã đọc.'), 'error');
      // Không giữ trạng thái "đã đọc" giả khi backend chưa ghi nhận.
      reloadAll();
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      const changed = await markAllNotificationsRead();
      applyRead(notifications.map((n) => n.id));
      setUnreadCount(0);
      onUnreadCountChangeRef.current?.(0);
      showToast(
        changed > 0 ? `Đã đánh dấu ${changed} thông báo là đã đọc.` : 'Không còn thông báo nào chưa đọc.'
      );
      if (unreadOnly) void fetchNotifications();
    } catch (err) {
      showToast(errorMessage(err, 'Không thể đánh dấu tất cả đã đọc.'), 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const changeUnreadOnly = (value: boolean) => {
    setUnreadOnly(value);
    setPage(0);
  };

  const changeGroup = (value: NotificationGroup | null) => {
    setGroup(value);
    setPage(0);
  };

  const hasFilter = unreadOnly || group !== null;
  const emptyText = unreadOnly
    ? 'Bạn đã đọc hết thông báo'
    : group
      ? 'Chưa có thông báo nào trong nhóm này'
      : 'Chưa có thông báo nào';

  return (
    <div className="user-management-page notif-center" data-testid="notification-center-page">
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.bell} THÔNG BÁO</span>
            <span className="page-header__dot" />
            <span className="page-header__meta" data-testid="notif-center-unread-count">
              {unreadCount == null ? 'ĐANG ĐẾM…' : `${unreadCount} CHƯA ĐỌC`}
            </span>
          </div>
          <h1 className="page-title">Trung tâm thông báo</h1>
          <p className="page-subtitle">
            Mọi cảnh báo và việc cần làm dành cho bạn, mới nhất trước. Bấm vào một thông báo để mở thẳng bản ghi
            liên quan — thông báo sẽ tự chuyển sang đã đọc.
          </p>
        </div>
        <div className="page-header__actions">
          {onOpenPreferences && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onOpenPreferences}
              data-testid="btn-open-preferences"
            >
              {ICONS.settings} Cài đặt nhận thông báo
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={handleMarkAllRead}
            disabled={markingAll || !unreadCount}
            data-testid="btn-mark-all-read"
          >
            {ICONS.checkCircle} {markingAll ? 'Đang đánh dấu…' : 'Đánh dấu tất cả đã đọc'}
          </button>
          <button
            type="button"
            className="btn-icon-refresh"
            onClick={reloadAll}
            title="Tải lại"
            aria-label="Tải lại"
            disabled={loading}
            data-testid="btn-notif-refresh"
          >
            {ICONS.refresh}
          </button>
        </div>
      </div>

      <div className="notif-center__toolbar">
        <div className="status-tabs" role="tablist" aria-label="Trạng thái đọc">
          <button
            type="button"
            role="tab"
            aria-selected={!unreadOnly}
            className={`status-tab ${!unreadOnly ? 'status-tab--active' : ''}`}
            onClick={() => changeUnreadOnly(false)}
            data-testid="tab-all"
          >
            Tất cả
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={unreadOnly}
            className={`status-tab ${unreadOnly ? 'status-tab--active' : ''}`}
            onClick={() => changeUnreadOnly(true)}
            data-testid="tab-unread"
          >
            Chưa đọc
            {!!unreadCount && <span className="notif-center__count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
        </div>

        <div className="notif-center__legend" aria-label="Chú thích mức độ">
          {SEVERITY_ORDER.map((s) => (
            <span key={s} className={`notif-sev notif-sev--${s.toLowerCase()}`}>
              {SEVERITY_LABEL[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="notif-center__groups" role="group" aria-label="Lọc theo nhóm thông báo">
        <button
          type="button"
          className={`notif-chip ${group === null ? 'notif-chip--active' : ''}`}
          aria-pressed={group === null}
          onClick={() => changeGroup(null)}
          data-testid="group-filter-ALL"
        >
          Mọi nhóm
        </button>
        {GROUP_OPTIONS.map((g) => (
          <button
            key={g.value}
            type="button"
            className={`notif-chip ${group === g.value ? 'notif-chip--active' : ''}`}
            aria-pressed={group === g.value}
            onClick={() => changeGroup(g.value)}
            data-testid={`group-filter-${g.value}`}
          >
            {g.label}
          </button>
        ))}
        {hasFilter && (
          <button
            type="button"
            className="btn-link notif-center__clear"
            onClick={() => {
              setUnreadOnly(false);
              changeGroup(null);
            }}
            data-testid="btn-clear-filter"
          >
            Bỏ lọc
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link ml-auto" onClick={reloadAll}>
            Thử lại
          </button>
        </div>
      )}

      <div className="user-table-card notif-center__card">
        {loading ? (
          <div className="notif-panel__empty" aria-live="polite">
            <p>Đang tải thông báo…</p>
          </div>
        ) : error ? null : (
          <NotificationList
            notifications={notifications}
            onOpen={handleOpen}
            onMarkRead={handleMarkRead}
            openingId={openingId}
            emptyText={emptyText}
          />
        )}

        <div className="table-footer notif-center__footer">
          <span>
            Trang <strong>{page + 1}</strong>
          </span>
          <div className="notif-center__pager">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              data-testid="btn-prev-page"
            >
              ← Trang trước
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || notifications.length < PAGE_SIZE}
              data-testid="btn-next-page"
            >
              Trang sau →
            </button>
          </div>
        </div>
      </div>

      {toast &&
        createPortal(
          <div className={`toast-notification toast-notification--${toast.type}`} role="alert" aria-live="polite">
            <div className="toast-notification__content">
              <span className="toast-notification__icon">
                {toast.type === 'success' ? ICONS.checkCircle : ICONS.alertTriangle}
              </span>
              <span className="toast-notification__text">{toast.message}</span>
            </div>
            <button
              type="button"
              className="toast-notification__close"
              onClick={() => setToast(null)}
              aria-label="Đóng thông báo"
            >
              <span className="icon-sm">{ICONS.close}</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
