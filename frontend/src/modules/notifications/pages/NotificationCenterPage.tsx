import { useCallback, useEffect, useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import NotificationList from '../components/NotificationList';
import { getNotifications, markNotificationsRead, NotificationsApiError } from '../api/notificationsApi';
import type { NotificationRes } from '../types/notificationTypes';

const PAGE_SIZE = 20;

/**
 * Trung tâm thông báo đầy đủ — mọi loại thông báo in-app của chính người dùng hiện tại
 * (bao gồm `TIMESHEET_REMINDER` — NCL-06-CN-009), không riêng bảng chấm công. Bổ sung màn
 * hình này vì chuông thông báo trên thanh điều hướng trước đó chỉ có khung giao diện tĩnh,
 * chưa gọi API thật — đúng yêu cầu "Frontend chỉ cần hiển thị thông báo qua API Notification
 * đã có" của story.
 */
export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<NotificationRes[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(unreadOnly, page, PAGE_SIZE);
      setNotifications(data);
    } catch (err) {
      const message =
        err instanceof NotificationsApiError || err instanceof Error ? err.message : 'Không thể tải danh sách thông báo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, page]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (notification: NotificationRes) => {
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    try {
      await markNotificationsRead([notification.id]);
    } catch {
      // Rollback nếu API lỗi — tránh giao diện "đã đọc" giả trong khi backend chưa ghi nhận.
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: false } : n)));
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markNotificationsRead(unreadIds);
    } catch {
      void fetchNotifications();
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="user-management-page" data-testid="notification-center-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thông báo</h1>
          <p className="page-subtitle">Toàn bộ thông báo in-app của bạn, mới nhất trước.</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            data-testid="btn-mark-all-read"
          >
            {ICONS.checkCircle} Đánh dấu tất cả đã đọc
          </button>
          <button type="button" className="btn-icon-refresh" onClick={fetchNotifications} title="Tải lại" aria-label="Tải lại" disabled={loading}>
            {ICONS.refresh}
          </button>
        </div>
      </div>

      <div className="status-tabs" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`status-tab ${!unreadOnly ? 'status-tab--active' : ''}`}
          onClick={() => {
            setUnreadOnly(false);
            setPage(0);
          }}
          data-testid="tab-all"
        >
          Tất cả
        </button>
        <button
          type="button"
          className={`status-tab ${unreadOnly ? 'status-tab--active' : ''}`}
          onClick={() => {
            setUnreadOnly(true);
            setPage(0);
          }}
          data-testid="tab-unread"
        >
          Chưa đọc
        </button>
      </div>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link text-white ml-auto" onClick={fetchNotifications}>
            Thử lại
          </button>
        </div>
      )}

      <div className="user-table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải thông báo…</div>
        ) : (
          <NotificationList notifications={notifications} onMarkRead={handleMarkRead} />
        )}

        <div className="table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Trang <strong>{page + 1}</strong>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
              ← Trang trước
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || notifications.length < PAGE_SIZE}
            >
              Trang sau →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
