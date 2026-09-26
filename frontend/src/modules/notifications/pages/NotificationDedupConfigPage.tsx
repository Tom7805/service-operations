import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ICONS } from '../../../components/common/icons';
import { roleLabels } from '../../../utils/roleLabel';
import DedupConfigCard, { EVENT_META } from '../components/DedupConfigCard';
import { getDedupConfigs, NotificationsApiError, updateDedupConfig } from '../api/notificationsApi';
import type { NotificationDedupConfig, NotificationDedupConfigReq, NotificationType } from '../types/notificationTypes';

export interface NotificationDedupConfigPageProps {
  currentUserRoles?: string[];
  /** Mở "Nhật ký hệ thống" để tra lại lịch sử thay đổi cấu hình (TC-04). */
  onViewAuditLog?: () => void;
}

/**
 * Chống gửi trùng thông báo (NCL-14-CN-003, QTN-27) — Quản trị viên xem và chỉnh cách hệ thống
 * chống gửi lại cùng một cảnh báo theo từng loại sự kiện.
 *
 * Luôn gọi API thật kể cả khi vai trò hiện tại không phải Quản trị viên: người khác nhận 403 và
 * backend ghi lại lần từ chối vào Nhật ký hệ thống (TC-03). Mỗi lần lưu, backend ghi người thực
 * hiện, nội dung, thời điểm; màn hình hiện lại `updatedBy`/`updatedAt` từ máy chủ (TC-04).
 */
export default function NotificationDedupConfigPage({ currentUserRoles = [], onViewAuditLog }: NotificationDedupConfigPageProps) {
  const [configs, setConfigs] = useState<NotificationDedupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfigs(await getDedupConfigs());
      setForbidden(false);
    } catch (err) {
      if (err instanceof NotificationsApiError && err.statusCode === 403) {
        setForbidden(true);
      } else {
        setError(err instanceof Error ? err.message : 'Không thể tải cấu hình chống gửi trùng thông báo.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (eventType: NotificationType, payload: NotificationDedupConfigReq): Promise<boolean> => {
    try {
      await updateDedupConfig(eventType, payload);
      const label = EVENT_META[eventType]?.label ?? eventType;
      showToast(`Đã lưu cấu hình chống gửi trùng cho "${label}".`);
      // Nạp lại để lấy người cập nhật/thời điểm do máy chủ ghi (TC-04).
      void load();
      return true;
    } catch (err) {
      if (err instanceof NotificationsApiError && err.statusCode === 403) {
        setForbidden(true);
        return false;
      }
      showToast(err instanceof Error ? err.message : 'Không thể lưu cấu hình chống gửi trùng.', 'error');
      return false;
    }
  };

  if (forbidden) {
    return (
      <div className="access-denied-container" data-testid="dedup-access-denied">
        <div className="access-denied-card">
          <div className="access-denied-icon">{ICONS.shieldOff}</div>
          <h2>Bạn không có thẩm quyền truy cập màn hình này</h2>
          <p>
            Cấu hình chống gửi trùng thông báo chỉ dành cho <strong>Quản trị viên</strong>. Lần truy cập này đã được ghi
            vào nhật ký hệ thống.
          </p>
          <div className="security-log-badge">
            <span className="security-log-badge__item">Vai trò hiện tại: {roleLabels(currentUserRoles) || '—'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page dedup-page" data-testid="notification-dedup-page">
      <div className="page-header">
        <div>
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.bell} THÔNG BÁO</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">QTN-27 · KHÔNG GỬI TRÙNG</span>
          </div>
          <h1 className="page-title">Chống gửi trùng thông báo</h1>
          <p className="page-subtitle">
            Mỗi cảnh báo được gắn khóa gồm loại sự kiện, bản ghi liên quan và người nhận — các lần rà soát sau bỏ qua nếu
            khóa đã tồn tại, để người dùng không bị làm phiền bởi cùng một cảnh báo.
          </p>
        </div>
        <div className="page-header__actions">
          {onViewAuditLog && (
            <button type="button" className="btn-secondary" onClick={onViewAuditLog} data-testid="btn-dedup-audit-log">
              {ICONS.clipboardList} Nhật ký hệ thống
            </button>
          )}
          <button
            type="button"
            className="btn-icon-refresh"
            onClick={() => void load()}
            title="Tải lại"
            aria-label="Tải lại"
            disabled={loading}
          >
            {ICONS.refresh}
          </button>
        </div>
      </div>

      <ol className="dedup-howto" aria-label="Cách hệ thống chống gửi trùng">
        <li>
          <span className="dedup-howto__step">1</span>
          <div>
            <strong>Bắt đầu một đợt cảnh báo</strong>
            <p>Bản ghi chuyển từ bình thường sang cần cảnh báo — hệ thống gửi cho mỗi người nhận đúng một lần.</p>
          </div>
        </li>
        <li>
          <span className="dedup-howto__step">2</span>
          <div>
            <strong>Rà soát lại trong cùng đợt</strong>
            <p>Tác vụ nền chạy lại (vd sau một giờ) mà bản ghi vẫn vượt ngưỡng — không gửi lại.</p>
          </div>
        </li>
        <li>
          <span className="dedup-howto__step">3</span>
          <div>
            <strong>Thoát rồi vượt ngưỡng lần nữa</strong>
            <p>Được coi là sự kiện mới — hệ thống gửi cảnh báo thêm một lần.</p>
          </div>
        </li>
      </ol>

      {error && (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{error}</span>
          <button type="button" className="btn-link ml-auto" onClick={() => void load()} data-testid="btn-dedup-retry">
            Thử lại
          </button>
        </div>
      )}

      {loading && configs.length === 0 ? (
        <div className="user-table-card">
          <div className="notif-panel__empty" aria-live="polite">
            <p>Đang tải cấu hình…</p>
          </div>
        </div>
      ) : !error && configs.length === 0 ? (
        <div className="user-table-card">
          <div className="notif-panel__empty" data-testid="dedup-empty">
            <span className="notif-panel__empty-icon">{ICONS.bell}</span>
            <p>Chưa có loại sự kiện nào dùng cơ chế chống gửi trùng.</p>
          </div>
        </div>
      ) : (
        <div className="dedup-list">
          {configs.map((c) => (
            // Đổi key theo thời điểm cập nhật để thẻ nạp lại giá trị mới từ máy chủ sau khi lưu.
            <DedupConfigCard key={`${c.eventType}-${c.updatedAt ?? 'default'}`} config={c} onSave={handleSave} />
          ))}
        </div>
      )}

      <div className="info-callout dedup-page__callout">
        <span className="info-callout__icon">{ICONS.info}</span>
        <span>
          Cảnh báo âm biên lợi nhuận, nhắc nộp bảng chấm công và nhắc thu công nợ có cơ chế chống trùng riêng nên không
          hiện ở đây. Mỗi lần lưu được ghi vào nhật ký hệ thống kèm người thực hiện, nội dung và thời điểm.
        </span>
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
