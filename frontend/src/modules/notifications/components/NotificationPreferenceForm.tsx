import type { ReactNode } from 'react';
import { ICONS } from '../../../components/common/icons';
import type { NotificationFrequency, NotificationGroup, NotificationPreference } from '../types/notificationTypes';

/** Nhãn + mô tả từng nhóm — khớp bảng "Gồm các type" ở api-contract, mục NCL-14-CN-002. */
export const GROUP_META: Record<NotificationGroup, { label: string; description: string; icon: ReactNode }> = {
  TIMESHEET: {
    label: 'Bảng chấm công',
    description: 'Bảng chấm công chờ duyệt, bị từ chối, nhắc nộp và đồng hồ bấm giờ tự dừng.',
    icon: ICONS.clock,
  },
  EXPENSE: { label: 'Chi phí', description: 'Phiếu chi phí dự án được nộp chờ duyệt.', icon: ICONS.money },
  PROJECT: {
    label: 'Dự án',
    description: 'Mốc tiến độ sắp đến hạn, biên lợi nhuận âm và công việc vượt ngân sách giờ công.',
    icon: ICONS.briefcase,
  },
  CONTRACT: { label: 'Hợp đồng', description: 'Hợp đồng sắp hết hạn.', icon: ICONS.document },
  INVOICE: {
    label: 'Hóa đơn',
    description: 'Đề nghị xuất hóa đơn, nhắc thu công nợ và hóa đơn định kỳ được tạo.',
    icon: ICONS.receipt,
  },
  ACCEPTANCE: {
    label: 'Nghiệm thu',
    description: 'Khách hàng xác nhận hoặc từ chối phiếu nghiệm thu trên cổng khách hàng.',
    icon: ICONS.checkCircle,
  },
};

export const GROUP_ORDER: NotificationGroup[] = ['TIMESHEET', 'EXPENSE', 'PROJECT', 'CONTRACT', 'INVOICE', 'ACCEPTANCE'];

const FREQUENCY_OPTIONS: { value: NotificationFrequency; label: string; hint: string }[] = [
  { value: 'IMMEDIATE', label: 'Nhận ngay', hint: 'Hiện trong trung tâm thông báo ngay khi phát sinh' },
  { value: 'DAILY_DIGEST', label: 'Tổng hợp cuối ngày', hint: 'Gộp thành một bản tổng hợp lúc 20:00' },
];

export interface NotificationPreferenceFormProps {
  /** Cấu hình đang chỉnh (chưa lưu). */
  value: NotificationPreference[];
  /** Cấu hình đã lưu trên máy chủ — để đánh dấu nhóm nào đang có thay đổi chưa lưu. */
  saved: NotificationPreference[];
  onChange: (next: NotificationPreference[]) => void;
  disabled?: boolean;
}

function samePref(a: NotificationPreference | undefined, b: NotificationPreference | undefined): boolean {
  return !!a && !!b && a.enabled === b.enabled && a.frequency === b.frequency;
}

/**
 * Bảng cấu hình nhận thông báo theo nhóm (NCL-14-CN-002): bật/tắt từng nhóm và chọn nhận ngay
 * hoặc tổng hợp cuối ngày. Tần suất bị khóa khi nhóm đang tắt — tắt rồi thì không nhận gì cả.
 */
export default function NotificationPreferenceForm({ value, saved, onChange, disabled = false }: NotificationPreferenceFormProps) {
  const byGroup = new Map(value.map((p) => [p.notificationGroup, p]));
  const savedByGroup = new Map(saved.map((p) => [p.notificationGroup, p]));

  const update = (group: NotificationGroup, patch: Partial<NotificationPreference>) => {
    onChange(value.map((p) => (p.notificationGroup === group ? { ...p, ...patch } : p)));
  };

  return (
    <ul className="pref-list" aria-label="Cấu hình theo nhóm thông báo">
      {GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => {
        const pref = byGroup.get(group)!;
        const meta = GROUP_META[group];
        const dirty = !samePref(pref, savedByGroup.get(group));
        const switchId = `pref-switch-${group}`;
        return (
          <li
            key={group}
            className={`pref-row ${pref.enabled ? '' : 'pref-row--off'} ${dirty ? 'pref-row--dirty' : ''}`}
            data-testid={`pref-row-${group}`}
          >
            <span className="pref-row__icon" aria-hidden="true">
              {meta.icon}
            </span>
            <div className="pref-row__body">
              <div className="pref-row__title-line">
                <label className="pref-row__title" htmlFor={switchId}>
                  {meta.label}
                </label>
                {dirty && (
                  <span className="pref-row__dirty" data-testid={`pref-dirty-${group}`}>
                    Chưa lưu
                  </span>
                )}
              </div>
              <p className="pref-row__desc">{meta.description}</p>

              <div
                className="pref-freq"
                role="radiogroup"
                aria-label={`Tần suất nhận nhóm ${meta.label}`}
                aria-disabled={!pref.enabled || disabled}
              >
                {FREQUENCY_OPTIONS.map((opt) => {
                  const checked = pref.frequency === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`pref-freq__option ${checked ? 'pref-freq__option--checked' : ''}`}
                      title={opt.hint}
                    >
                      <input
                        type="radio"
                        name={`freq-${group}`}
                        value={opt.value}
                        checked={checked}
                        disabled={!pref.enabled || disabled}
                        onChange={() => update(group, { frequency: opt.value })}
                        data-testid={`pref-freq-${group}-${opt.value}`}
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
              {!pref.enabled ? (
                <p className="pref-row__note" data-testid={`pref-note-${group}`}>
                  Bạn sẽ không nhận thông báo mới nào của nhóm này. Thông báo đã nhận trước đó vẫn được giữ lại.
                </p>
              ) : pref.frequency === 'DAILY_DIGEST' ? (
                <p className="pref-row__note" data-testid={`pref-note-${group}`}>
                  Các thông báo trong ngày được gộp thành một bản tổng hợp gửi lúc 20:00.
                </p>
              ) : null}
            </div>

            <button
              type="button"
              id={switchId}
              role="switch"
              aria-checked={pref.enabled}
              aria-label={`${pref.enabled ? 'Tắt' : 'Bật'} nhận thông báo nhóm ${meta.label}`}
              className={`pref-switch ${pref.enabled ? 'pref-switch--on' : ''}`}
              onClick={() => update(group, { enabled: !pref.enabled })}
              disabled={disabled}
              data-testid={`pref-switch-${group}`}
            >
              <span className="pref-switch__thumb" aria-hidden="true" />
              <span className="pref-switch__text">{pref.enabled ? 'Đang bật' : 'Đang tắt'}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
