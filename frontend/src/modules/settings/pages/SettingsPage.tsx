import { useMemo, useState, type ReactNode } from 'react';
import { ICONS } from '../../../components/common/icons';
import PageHeader, { HubContext } from '../../../components/common/PageHeader';
import { roleLabels } from '../../../utils/roleLabel';
import type { Density, ThemeMode, UiPreferences } from '../../../utils/preferences';
import NotificationPreferencePage from '../../notifications/pages/NotificationPreferencePage';
import ChangePasswordPage from '../../auth/pages/ChangePasswordPage';
import MaskingRulePage from '../../auditLog/pages/MaskingRulePage';
import { SETTINGS_SECTION_LABELS, type SettingsSection } from '../settingsSections';

export type { SettingsSection };
/** `local`: đã áp dụng và nhớ trên máy này nhưng máy chủ chưa nhận (chưa theo tài khoản sang máy khác). */
export type SaveState = 'idle' | 'saving' | 'saved' | 'local';

export interface SettingsPageProps {
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  fullName: string;
  username: string;
  roles: string[];
  prefs: UiPreferences;
  onChangePrefs: (patch: Partial<UiPreferences>) => void;
  saveState: SaveState;
  /** Màn hình người dùng mở được — lựa chọn cho "Màn hình mở đầu". */
  landingOptions: Array<{ tab: string; label: string }>;
  /** Nhân sự / Kế toán / Ban giám đốc: xem được quy tắc che lương, giá vốn (QTN-02). */
  showAccess: boolean;
  idleMinutes: number;
  onLogout: () => void;
  onPasswordChanged: () => void;
}

const SECTION_ICONS: Record<SettingsSection, ReactNode> = {
  account: ICONS.user,
  appearance: ICONS.spark,
  notifications: ICONS.bell,
  security: ICONS.key,
  access: ICONS.shield,
  help: ICONS.helpCircle,
};

const SECTIONS: Array<{ id: SettingsSection; label: string; icon: ReactNode }> = (
  Object.keys(SETTINGS_SECTION_LABELS) as SettingsSection[]
).map((id) => ({ id, label: SETTINGS_SECTION_LABELS[id], icon: SECTION_ICONS[id] }));

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'LIGHT', label: 'Sáng' },
  { value: 'DARK', label: 'Tối' },
  { value: 'SYSTEM', label: 'Theo hệ thống' },
];

const DENSITY_OPTIONS: Array<{ value: Density; label: string; hint: string }> = [
  { value: 'COMFORTABLE', label: 'Thoải mái', hint: 'Hàng thoáng, dễ đọc' },
  { value: 'COMPACT', label: 'Gọn', hint: 'Nhiều dòng hơn trên một màn hình' },
];

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl';

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: [MOD, 'K'], label: 'Mở tìm nhanh — nhảy tới bất kỳ màn hình nào' },
  { keys: [MOD, 'B'], label: 'Thu gọn / mở rộng thanh bên' },
  { keys: ['Esc'], label: 'Đóng hộp thoại hoặc menu đang mở' },
  { keys: ['?'], label: 'Mở Trợ giúp & phím tắt' },
];

const FLOW: Array<{ step: string; who: string; where: string }> = [
  { step: 'Ghi nhận khách hàng và cơ hội bán hàng', who: 'Kinh doanh', where: 'Khách hàng · Cơ hội' },
  { step: 'Chốt cơ hội thành công, lập hợp đồng', who: 'Kinh doanh', where: 'Cơ hội' },
  { step: 'Khai báo loại, hạn mức hợp đồng', who: 'Kế toán', where: 'Hợp đồng' },
  { step: 'Mở dự án từ hợp đồng, chia hạng mục và giao việc', who: 'Quản lý dự án', where: 'Khách hàng › Lịch sử hợp tác · Dự án' },
  { step: 'Ghi giờ công và nộp bảng chấm công tuần', who: 'Nhân viên', where: 'Việc của tôi' },
  { step: 'Duyệt giờ công, nghiệm thu hạng mục', who: 'Quản lý dự án', where: 'Duyệt giờ công · Nghiệm thu' },
  { step: 'Lập hóa đơn, ghi nhận thanh toán, khóa kỳ', who: 'Kế toán', where: 'Hợp đồng · Hóa đơn · Kỳ chấm công' },
  { step: 'Theo dõi lợi nhuận và báo cáo', who: 'Ban giám đốc · Kế toán', where: 'Lợi nhuận dự án · Báo cáo' },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

/** Một hàng cài đặt: nhãn + mô tả ngắn bên trái, điều khiển bên phải — như hộp thoại Cài đặt của Claude. */
function SettingRow({ title, hint, children, stacked = false }: { title: string; hint?: string; children: ReactNode; stacked?: boolean }) {
  return (
    <div className={`settings-row ${stacked ? 'settings-row--stacked' : ''}`}>
      <div className="settings-row__text">
        <div className="settings-row__title">{title}</div>
        {hint && <div className="settings-row__hint">{hint}</div>}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`settings-switch ${checked ? 'settings-switch--on' : ''}`}
      onClick={() => onChange(!checked)}
      data-testid={testId}
    >
      <span className="settings-switch__thumb" />
    </button>
  );
}

/** Ô xem trước chủ đề: vẽ thu nhỏ khung ứng dụng bằng màu của chính chủ đề đó. */
function ThemePreview({ mode }: { mode: ThemeMode }) {
  return (
    <span className={`theme-preview theme-preview--${mode.toLowerCase()}`} aria-hidden="true">
      <span className="theme-preview__side" />
      <span className="theme-preview__main">
        <span className="theme-preview__line theme-preview__line--strong" />
        <span className="theme-preview__line" />
        <span className="theme-preview__line theme-preview__line--short" />
      </span>
    </span>
  );
}

export default function SettingsPage({
  section,
  onSectionChange,
  fullName,
  username,
  roles,
  prefs,
  onChangePrefs,
  saveState,
  landingOptions,
  showAccess,
  idleMinutes,
  onLogout,
  onPasswordChanged,
}: SettingsPageProps) {
  const sections = useMemo(() => SECTIONS.filter((s) => s.id !== 'access' || showAccess), [showAccess]);
  const active = sections.some((s) => s.id === section) ? section : 'account';
  // Khe để các trang nhúng (thông báo, quyền xem dữ liệu) đặt nút thao tác ngang tiêu đề mục.
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
  const embedded = active === 'notifications' || active === 'security' || active === 'access';

  // Máy chủ không nhận (mất mạng, máy chủ chưa cập nhật): tùy chọn vẫn đã áp dụng và nhớ trên máy này — báo
  // đúng như vậy bằng chữ nhạt, không báo lỗi đỏ; lần đổi sau sẽ thử đồng bộ lại.
  const saveHint =
    saveState === 'saving' ? 'Đang lưu…' : saveState === 'saved' ? 'Đã lưu' : saveState === 'local' ? 'Đã lưu trên máy này' : '';

  return (
    <div className="user-management-page settings-page">
      <PageHeader title="Cài đặt" />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Mục cài đặt">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`settings-nav__item ${active === s.id ? 'settings-nav__item--active' : ''}`}
              aria-current={active === s.id ? 'page' : undefined}
              onClick={() => onSectionChange(s.id)}
              data-testid={`settings-nav-${s.id}`}
            >
              <span className="settings-nav__icon" aria-hidden="true">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <section className="settings-panel" aria-labelledby="settings-panel-title">
          <div className="settings-panel__head">
            <h2 id="settings-panel-title" className="settings-panel__title">{SETTINGS_SECTION_LABELS[active]}</h2>
            {active === 'appearance' && saveHint && (
              <span
                className={`settings-save settings-save--${saveState}`}
                role="status"
                aria-live="polite"
                title={saveState === 'local' ? 'Chưa đồng bộ lên tài khoản nên chưa theo bạn sang máy khác. Sẽ thử lại ở lần thay đổi sau.' : undefined}
              >
                {saveState === 'saved' && <span className="icon-xs">{ICONS.check}</span>}
                {saveHint}
              </span>
            )}
            {embedded && <div className="settings-panel__actions" ref={setActionSlot} />}
          </div>

          {active === 'account' && (
            <div className="settings-group" data-testid="settings-account">
              <div className="settings-profile">
                <span className="avatar-circle settings-profile__avatar">{initials(fullName)}</span>
                <div className="settings-profile__text">
                  <strong>{fullName}</strong>
                  <span>@{username}</span>
                </div>
              </div>
              <SettingRow title="Vai trò" hint="Quyết định những màn hình và dữ liệu bạn thấy. Quản trị viên phân vai trò.">
                <span className="settings-value">{roleLabels(roles) || '—'}</span>
              </SettingRow>
              <SettingRow
                title="Phiên làm việc"
                hint={`Tự đăng xuất sau ${idleMinutes} phút không thao tác, theo chính sách bảo mật của công ty.`}
              >
                <button type="button" className="btn-secondary btn-sm" onClick={onLogout} data-testid="settings-logout">
                  {ICONS.logout} Đăng xuất
                </button>
              </SettingRow>
            </div>
          )}

          {active === 'appearance' && (
            <div className="settings-group" data-testid="settings-appearance">
              <SettingRow title="Chủ đề" hint="Theo hệ thống: tự đổi theo chế độ Sáng/Tối của máy tính." stacked>
                <div className="theme-options" role="radiogroup" aria-label="Chủ đề">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={prefs.theme === opt.value}
                      className={`theme-option ${prefs.theme === opt.value ? 'theme-option--active' : ''}`}
                      onClick={() => onChangePrefs({ theme: opt.value })}
                      data-testid={`theme-option-${opt.value}`}
                    >
                      <ThemePreview mode={opt.value} />
                      <span className="theme-option__label">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow title="Mật độ hiển thị" hint="Khoảng cách giữa các dòng của danh sách và bảng.">
                <div className="segmented" role="radiogroup" aria-label="Mật độ hiển thị">
                  {DENSITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={prefs.density === opt.value}
                      title={opt.hint}
                      className={`segmented__item ${prefs.density === opt.value ? 'segmented__item--active' : ''}`}
                      onClick={() => onChangePrefs({ density: opt.value })}
                      data-testid={`density-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </SettingRow>

              <SettingRow title="Màn hình mở đầu" hint="Màn hình hiện ra ngay sau khi đăng nhập.">
                <select
                  className="form-select settings-select"
                  value={prefs.landingTab ?? ''}
                  onChange={(e) => onChangePrefs({ landingTab: e.target.value || null })}
                  aria-label="Màn hình mở đầu"
                  data-testid="settings-landing"
                >
                  <option value="">Mặc định theo vai trò</option>
                  {landingOptions.map((opt) => (
                    <option key={opt.tab} value={opt.tab}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow title="Thu gọn thanh bên" hint={`Chỉ hiện biểu tượng. Phím tắt: ${MOD} + B.`}>
                <Switch
                  checked={prefs.sidebarCollapsed}
                  onChange={(v) => onChangePrefs({ sidebarCollapsed: v })}
                  label="Thu gọn thanh bên"
                  testId="settings-sidebar"
                />
              </SettingRow>

              <SettingRow title="Giảm hiệu ứng chuyển động" hint="Tắt các hiệu ứng mờ dần, trượt khi mở trang và hộp thoại.">
                <Switch
                  checked={prefs.reduceMotion}
                  onChange={(v) => onChangePrefs({ reduceMotion: v })}
                  label="Giảm hiệu ứng chuyển động"
                  testId="settings-motion"
                />
              </SettingRow>
            </div>
          )}

          {embedded && (
            <HubContext.Provider value={{ embedded: true, actionSlot }}>
              <div className="settings-embed">
                {active === 'notifications' && <NotificationPreferencePage />}
                {active === 'security' && <ChangePasswordPage onBack={() => onSectionChange('account')} onPasswordChanged={onPasswordChanged} />}
                {active === 'access' && <MaskingRulePage currentUserRoles={roles} />}
              </div>
            </HubContext.Provider>
          )}

          {active === 'help' && (
            <div className="settings-group" data-testid="settings-help">
              <h3 className="settings-subtitle">Phím tắt</h3>
              <ul className="shortcut-list">
                {SHORTCUTS.map((s) => (
                  <li key={s.label} className="shortcut-list__item">
                    <span>{s.label}</span>
                    <span className="shortcut-list__keys">
                      {s.keys.map((k) => (
                        <kbd key={k} className="cmdk__kbd">{k}</kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>

              <h3 className="settings-subtitle">Luồng nghiệp vụ chính</h3>
              <ol className="flow-list">
                {FLOW.map((f) => (
                  <li key={f.step} className="flow-list__item">
                    <span className="flow-list__step">{f.step}</span>
                    <span className="flow-list__meta">
                      {f.who} · <span className="flow-list__where">{f.where}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <p className="settings-note">
                Cần thêm quyền hoặc gặp lỗi? Liên hệ Quản trị viên hệ thống — kèm tên màn hình và thời điểm gặp lỗi.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
