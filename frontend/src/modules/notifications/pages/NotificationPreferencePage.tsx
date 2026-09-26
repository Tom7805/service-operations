import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ICONS } from '../../../components/common/icons';
import NotificationPreferenceForm, { GROUP_META } from '../components/NotificationPreferenceForm';
import {
  getNotificationPreferences,
  NotificationsApiError,
  updateNotificationPreferences,
} from '../api/notificationsApi';
import type { NotificationPreference } from '../types/notificationTypes';

export interface NotificationPreferencePageProps {
  /** Quay lại trung tâm thông báo. */
  onBack?: () => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof NotificationsApiError || err instanceof Error ? err.message : fallback;
}

/** Các nhóm có cấu hình khác với bản đã lưu — chỉ gửi những nhóm này lên PUT. */
export function changedPreferences(
  draft: NotificationPreference[],
  saved: NotificationPreference[]
): NotificationPreference[] {
  const savedByGroup = new Map(saved.map((p) => [p.notificationGroup, p]));
  return draft.filter((p) => {
    const s = savedByGroup.get(p.notificationGroup);
    return !s || s.enabled !== p.enabled || s.frequency !== p.frequency;
  });
}

/**
 * Cấu hình kênh và tần suất nhận thông báo (NCL-14-CN-002). Người dùng bật/tắt từng nhóm và
 * chọn nhận ngay hoặc tổng hợp cuối ngày; hệ thống áp dụng ngay từ lúc lưu (TC-01, TC-02). Mỗi
 * lần lưu, backend ghi nhật ký người thực hiện, nội dung và thời điểm (TC-03).
 */
export default function NotificationPreferencePage({ onBack }: NotificationPreferencePageProps = {}) {
  const [saved, setSaved] = useState<NotificationPreference[]>([]);
  const [draft, setDraft] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
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
    setLoadError(null);
    try {
      const data = await getNotificationPreferences();
      setSaved(data);
      setDraft(data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Không thể tải cấu hình nhận thông báo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changes = changedPreferences(draft, saved);
  const dirty = changes.length > 0;

  // Nhắc khi đóng/tải lại tab trình duyệt lúc còn thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await updateNotificationPreferences(changes);
      setSaved(draft);
      setLastSavedAt(new Date());
      const names = changes.map((c) => GROUP_META[c.notificationGroup].label).join(', ');
      showToast(`Đã lưu cấu hình nhận thông báo (${changes.length} nhóm: ${names}).`);
    } catch (err) {
      // Giữ nguyên bản nháp để người dùng sửa và thử lại, không mất lựa chọn vừa chọn.
      showToast(errorMessage(err, 'Không thể lưu cấu hình nhận thông báo.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setDraft(saved);

  const handleRestoreDefaults = () =>
    setDraft((prev) => prev.map((p) => ({ ...p, enabled: true, frequency: 'IMMEDIATE' as const })));

  const handleBack = () => {
    if (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')) return;
    onBack?.();
  };

  const offCount = draft.filter((p) => !p.enabled).length;
  const digestCount = draft.filter((p) => p.enabled && p.frequency === 'DAILY_DIGEST').length;
  const immediateCount = draft.length - offCount - digestCount;
  const isDefault = draft.every((p) => p.enabled && p.frequency === 'IMMEDIATE');

  return (
    <div className="user-management-page pref-page" data-testid="notification-preference-page">
      <div className="page-header">
        <div>
          {onBack && (
            <button type="button" className="btn-link pref-page__back" onClick={handleBack} data-testid="btn-pref-back">
              {ICONS.arrowLeft} Trung tâm thông báo
            </button>
          )}
          <div className="page-header__kicker">
            <span className="page-header__tag">{ICONS.settings} THÔNG BÁO</span>
            <span className="page-header__dot" />
            <span className="page-header__meta">CẤU HÌNH NHẬN</span>
          </div>
          <h1 className="page-title">Cài đặt nhận thông báo</h1>
          <p className="page-subtitle">
            Chọn nhóm thông báo muốn nhận và nhận ngay hay gộp thành bản tổng hợp cuối ngày. Thay đổi áp dụng cho
            thông báo phát sinh từ lúc lưu, không ảnh hưởng thông báo đã nhận.
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="alert alert--error mb-4" role="alert">
          <span className="alert__icon">{ICONS.alertTriangle}</span>
          <span>{loadError}</span>
          <button type="button" className="btn-link ml-auto" onClick={() => void load()} data-testid="btn-pref-retry">
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="user-table-card">
          <div className="notif-panel__empty" aria-live="polite">
            <p>Đang tải cấu hình…</p>
          </div>
        </div>
      ) : (
        <>
          <div className="pref-summary" data-testid="pref-summary" aria-live="polite">
            <span className="pref-summary__item">
              <strong>{immediateCount}</strong> nhóm nhận ngay
            </span>
            <span className="pref-summary__item">
              <strong>{digestCount}</strong> nhóm tổng hợp cuối ngày
            </span>
            <span className="pref-summary__item">
              <strong>{offCount}</strong> nhóm đang tắt
            </span>
            <span className="pref-summary__spacer" />
            <button
              type="button"
              className="btn-link"
              onClick={handleRestoreDefaults}
              disabled={saving || isDefault}
              data-testid="btn-pref-defaults"
            >
              Khôi phục mặc định
            </button>
          </div>

          <div className="user-table-card pref-card">
            <NotificationPreferenceForm value={draft} saved={saved} onChange={setDraft} disabled={saving} />
          </div>

          <div className="info-callout pref-page__callout">
            <span className="info-callout__icon">{ICONS.info}</span>
            <span>
              Cảnh báo bảo mật tài khoản và bản tổng hợp cuối ngày luôn được gửi, không tắt được. Mỗi lần lưu, hệ thống
              ghi lại người thay đổi, nội dung và thời điểm vào nhật ký hệ thống.
            </span>
          </div>

          <div className={`pref-actionbar ${dirty ? 'pref-actionbar--dirty' : ''}`} data-testid="pref-actionbar">
            <span className="pref-actionbar__status" data-testid="pref-status">
              {dirty
                ? `Có ${changes.length} nhóm thay đổi chưa lưu`
                : lastSavedAt
                  ? `Đã lưu lúc ${lastSavedAt.toLocaleTimeString('vi-VN')}`
                  : 'Không có thay đổi'}
            </span>
            <div className="pref-actionbar__buttons">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleReset}
                disabled={!dirty || saving}
                data-testid="btn-pref-reset"
              >
                Hoàn tác
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={!dirty || saving}
                data-testid="btn-pref-save"
              >
                {ICONS.save} {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </>
      )}

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
