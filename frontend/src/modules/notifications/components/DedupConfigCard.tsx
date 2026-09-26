import { useState } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { NotificationDedupConfig, NotificationDedupConfigReq, NotificationType } from '../types/notificationTypes';

/** Nhãn + mô tả loại sự kiện — backend hiện chỉ trả `TASK_BUDGET_EXCEEDED` (xem api-contract NCL-14-CN-003). */
export const EVENT_META: Partial<Record<NotificationType, { label: string; description: string }>> = {
  TASK_BUDGET_EXCEEDED: {
    label: 'Công việc vượt ngân sách giờ công',
    description:
      'Gửi cho quản lý dự án khi giờ công đã duyệt đạt từ 80% ngân sách của một công việc (QTN-20). Tác vụ nền rà soát mỗi giờ và ngay sau khi duyệt bảng chấm công.',
  },
};

export const MAX_COOLDOWN_HOURS = 8760;

type CooldownMode = 'NONE' | 'HOURS';

/** Kiểm tra ô số giờ nhắc lại — khớp ràng buộc `@Min(1)` của backend, thêm giới hạn trên 1 năm. */
export function validateCooldown(mode: CooldownMode, hoursInput: string): string | null {
  if (mode === 'NONE') return null;
  const trimmed = hoursInput.trim();
  if (trimmed === '') return 'Nhập số giờ tối thiểu giữa hai lần nhắc.';
  if (!/^\d+$/.test(trimmed)) return 'Số giờ phải là số nguyên dương.';
  const value = Number(trimmed);
  if (value < 1) return 'Số giờ phải từ 1 trở lên.';
  if (value > MAX_COOLDOWN_HOURS) return `Số giờ tối đa là ${MAX_COOLDOWN_HOURS} (1 năm).`;
  return null;
}

function formatDateTime(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

export interface DedupConfigCardProps {
  config: NotificationDedupConfig;
  /** Lưu cấu hình — trả về `true` khi thành công để thẻ bỏ trạng thái "chưa lưu". */
  onSave: (eventType: NotificationType, payload: NotificationDedupConfigReq) => Promise<boolean>;
}

/**
 * Một thẻ cấu hình chống gửi trùng cho một loại sự kiện (NCL-14-CN-003). Tắt chống trùng buộc
 * xác nhận thêm một bước vì khi đó mỗi lần rà soát đều gửi lại cảnh báo cho người nhận.
 */
export default function DedupConfigCard({ config, onSave }: DedupConfigCardProps) {
  const [dedupEnabled, setDedupEnabled] = useState(config.dedupEnabled);
  const [mode, setMode] = useState<CooldownMode>(config.cooldownHours == null ? 'NONE' : 'HOURS');
  const [hoursInput, setHoursInput] = useState(config.cooldownHours == null ? '24' : String(config.cooldownHours));
  const [touched, setTouched] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [saving, setSaving] = useState(false);

  const meta = EVENT_META[config.eventType] ?? { label: config.eventType, description: '' };
  const error = dedupEnabled ? validateCooldown(mode, hoursInput) : null;
  const nextCooldown = dedupEnabled && mode === 'HOURS' && !error ? Number(hoursInput.trim()) : null;
  // Khi tắt chống trùng, số giờ nhắc lại không còn ý nghĩa — giữ nguyên giá trị đã lưu cho lần bật lại.
  const payload: NotificationDedupConfigReq = {
    dedupEnabled,
    cooldownHours: dedupEnabled ? nextCooldown : config.cooldownHours,
  };
  const dirty =
    dedupEnabled !== config.dedupEnabled || (dedupEnabled && (nextCooldown !== config.cooldownHours || !!error));
  const canSave = dirty && !error && !saving;
  const testId = config.eventType;

  const reset = () => {
    setDedupEnabled(config.dedupEnabled);
    setMode(config.cooldownHours == null ? 'NONE' : 'HOURS');
    setHoursInput(config.cooldownHours == null ? '24' : String(config.cooldownHours));
    setTouched(false);
    setConfirmDisable(false);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const ok = await onSave(config.eventType, payload);
      if (ok) {
        setTouched(false);
        setConfirmDisable(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    setTouched(true);
    if (!canSave) return;
    if (config.dedupEnabled && !dedupEnabled) {
      setConfirmDisable(true);
      return;
    }
    void doSave();
  };

  const statusLabel = !dedupEnabled
    ? 'Luôn gửi — không chống trùng'
    : nextCooldown != null
      ? `Mỗi đợt gửi 1 lần, nhắc lại sau mỗi ${nextCooldown} giờ nếu vẫn còn`
      : 'Mỗi đợt cảnh báo chỉ gửi 1 lần';

  return (
    <section
      className={`dedup-card ${dedupEnabled ? '' : 'dedup-card--off'} ${dirty ? 'dedup-card--dirty' : ''}`}
      aria-labelledby={`dedup-title-${testId}`}
      data-testid={`dedup-card-${testId}`}
    >
      <header className="dedup-card__head">
        <div className="dedup-card__heading">
          <h2 className="dedup-card__title" id={`dedup-title-${testId}`}>
            {meta.label}
          </h2>
          <code className="dedup-card__code">{config.eventType}</code>
          {dirty && <span className="pref-row__dirty">Chưa lưu</span>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dedupEnabled}
          aria-label={`${dedupEnabled ? 'Tắt' : 'Bật'} chống gửi trùng cho ${meta.label}`}
          className={`pref-switch ${dedupEnabled ? 'pref-switch--on' : ''}`}
          onClick={() => {
            setDedupEnabled((v) => !v);
            setConfirmDisable(false);
          }}
          disabled={saving}
          data-testid={`dedup-switch-${testId}`}
        >
          <span className="pref-switch__thumb" aria-hidden="true" />
          <span className="pref-switch__text">{dedupEnabled ? 'Chống trùng' : 'Đang tắt'}</span>
        </button>
      </header>

      {meta.description && <p className="dedup-card__desc">{meta.description}</p>}

      <fieldset className="dedup-card__cooldown" disabled={!dedupEnabled || saving}>
        <legend>Nhắc lại khi sự kiện kéo dài trong cùng một đợt</legend>
        <label className="dedup-radio">
          <input
            type="radio"
            name={`cooldown-${testId}`}
            checked={mode === 'NONE'}
            onChange={() => setMode('NONE')}
            data-testid={`dedup-mode-none-${testId}`}
          />
          <span>
            <strong>Không nhắc lại</strong>
            <small>Chỉ gửi lại khi bản ghi thoát ngưỡng rồi vượt lần nữa (đợt mới).</small>
          </span>
        </label>
        <label className="dedup-radio">
          <input
            type="radio"
            name={`cooldown-${testId}`}
            checked={mode === 'HOURS'}
            onChange={() => setMode('HOURS')}
            data-testid={`dedup-mode-hours-${testId}`}
          />
          <span>
            <strong>Nhắc lại sau mỗi</strong>
            <span className="dedup-hours">
              <input
                type="text"
                inputMode="numeric"
                className={`form-input dedup-hours__input ${touched && error ? 'form-input--error' : ''}`}
                value={hoursInput}
                onChange={(e) => {
                  setHoursInput(e.target.value);
                  setMode('HOURS');
                }}
                onBlur={() => setTouched(true)}
                aria-label="Số giờ giữa hai lần nhắc"
                aria-invalid={!!(touched && error)}
                aria-describedby={`dedup-err-${testId}`}
                data-testid={`dedup-hours-${testId}`}
              />
              giờ nếu vẫn chưa hết cảnh báo
            </span>
          </span>
        </label>
        {touched && error && (
          <span className="field-error" id={`dedup-err-${testId}`} role="alert" data-testid={`dedup-error-${testId}`}>
            {error}
          </span>
        )}
      </fieldset>

      {!dedupEnabled && (
        <div className="dedup-card__warn" role="note" data-testid={`dedup-off-warning-${testId}`}>
          <span />
          Khi tắt, mỗi lần tác vụ nền rà soát (mỗi giờ) đều gửi lại cảnh báo cho cùng công việc và cùng người nhận.
        </div>
      )}

      {confirmDisable && (
        <div className="dedup-confirm" role="alertdialog" aria-labelledby={`dedup-confirm-${testId}`}>
          <p id={`dedup-confirm-${testId}`}>
            <strong>Xác nhận tắt chống gửi trùng?</strong> Người nhận có thể nhận cùng một cảnh báo nhiều lần mỗi ngày.
          </p>
          <div className="dedup-confirm__actions">
            <button type="button" className="btn-secondary" onClick={() => setConfirmDisable(false)} disabled={saving}>
              Giữ chống trùng
            </button>
            <button
              type="button"
              className="btn-primary btn-danger"
              onClick={() => void doSave()}
              disabled={saving}
              data-testid={`dedup-confirm-disable-${testId}`}
            >
              {saving ? 'Đang lưu…' : 'Xác nhận tắt'}
            </button>
          </div>
        </div>
      )}

      <footer className="dedup-card__foot">
        <div className="dedup-card__meta">
          <span className="dedup-card__status" data-testid={`dedup-status-${testId}`}>
            {ICONS.info} {statusLabel}
          </span>
          <span className="dedup-card__audit" data-testid={`dedup-audit-${testId}`}>
            {config.updatedAt
              ? `Cập nhật lần cuối bởi ${config.updatedBy ?? 'không rõ'} lúc ${formatDateTime(config.updatedAt)}`
              : 'Chưa từng thay đổi — đang dùng mặc định (bật chống trùng, không nhắc lại).'}
          </span>
        </div>
        <div className="dedup-card__actions">
          <button type="button" className="btn-secondary" onClick={reset} disabled={!dirty || saving} data-testid={`dedup-reset-${testId}`}>
            Hoàn tác
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={!dirty || saving || confirmDisable}
            data-testid={`dedup-save-${testId}`}
          >
            {ICONS.save} {saving && !confirmDisable ? 'Đang lưu…' : 'Lưu cấu hình'}
          </button>
        </div>
      </footer>
    </section>
  );
}
