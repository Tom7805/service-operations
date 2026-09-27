import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage, { type SettingsPageProps } from '../pages/SettingsPage';
import { DEFAULT_PREFERENCES } from '../../../utils/preferences';

vi.mock('../../notifications/pages/NotificationPreferencePage', () => ({ default: () => <div>trang-thong-bao</div> }));
vi.mock('../../auth/pages/ChangePasswordPage', () => ({ default: () => <div>trang-doi-mat-khau</div> }));
vi.mock('../../auditLog/pages/MaskingRulePage', () => ({ default: () => <div>trang-quyen-xem</div> }));

function renderPage(overrides: Partial<SettingsPageProps> = {}) {
  const props: SettingsPageProps = {
    section: 'appearance',
    onSectionChange: vi.fn(),
    fullName: 'Trần Thu Hà',
    username: 'pm.lead',
    roles: ['VT-02'],
    prefs: DEFAULT_PREFERENCES,
    onChangePrefs: vi.fn(),
    saveState: 'idle',
    landingOptions: [
      { tab: 'MY_WORK', label: 'Việc của tôi' },
      { tab: 'PROJECTS', label: 'Dự án' },
    ],
    showAccess: false,
    idleMinutes: 30,
    onLogout: vi.fn(),
    onPasswordChanged: vi.fn(),
    ...overrides,
  };
  render(<SettingsPage {...props} />);
  return props;
}

describe('SettingsPage — Cài đặt cá nhân', () => {
  it('Giao diện: chọn chủ đề, mật độ, màn hình mở đầu, công tắc — mỗi thao tác báo ngay thay đổi để lưu', () => {
    const props = renderPage();
    fireEvent.click(screen.getByTestId('theme-option-DARK'));
    expect(props.onChangePrefs).toHaveBeenCalledWith({ theme: 'DARK' });
    fireEvent.click(screen.getByTestId('density-COMPACT'));
    expect(props.onChangePrefs).toHaveBeenCalledWith({ density: 'COMPACT' });
    fireEvent.change(screen.getByTestId('settings-landing'), { target: { value: 'PROJECTS' } });
    expect(props.onChangePrefs).toHaveBeenCalledWith({ landingTab: 'PROJECTS' });
    fireEvent.change(screen.getByTestId('settings-landing'), { target: { value: '' } });
    expect(props.onChangePrefs).toHaveBeenCalledWith({ landingTab: null });
    fireEvent.click(screen.getByTestId('settings-sidebar'));
    expect(props.onChangePrefs).toHaveBeenCalledWith({ sidebarCollapsed: true });
    fireEvent.click(screen.getByTestId('settings-motion'));
    expect(props.onChangePrefs).toHaveBeenCalledWith({ reduceMotion: true });
  });

  it('chủ đề đang dùng được đánh dấu; trạng thái lưu hiện cạnh tiêu đề mục', () => {
    renderPage({ prefs: { ...DEFAULT_PREFERENCES, theme: 'SYSTEM' }, saveState: 'saved' });
    expect(screen.getByTestId('theme-option-SYSTEM')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('theme-option-LIGHT')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu');
  });

  it('máy chủ không nhận: báo "Đã lưu trên máy này" (tùy chọn vẫn áp dụng), không báo lỗi', () => {
    renderPage({ saveState: 'local' });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Đã lưu trên máy này');
    expect(status).toHaveAttribute('title', expect.stringContaining('Chưa đồng bộ lên tài khoản'));
    expect(screen.queryByText(/Chưa lưu được/)).toBeNull();
  });

  it('mục "Quyền xem dữ liệu" chỉ có với vai trò được xem lương/giá vốn (QTN-02)', () => {
    renderPage({ showAccess: false });
    expect(screen.queryByTestId('settings-nav-access')).toBeNull();
  });

  it('Ban giám đốc / Kế toán / Nhân sự thấy mục "Quyền xem dữ liệu" và mở được', () => {
    const props = renderPage({ showAccess: true, section: 'access', roles: ['VT-05'] });
    expect(screen.getByTestId('settings-nav-access')).toBeInTheDocument();
    expect(screen.getByText('trang-quyen-xem')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('settings-nav-security'));
    expect(props.onSectionChange).toHaveBeenCalledWith('security');
  });

  it('Tài khoản: thông tin người dùng, chính sách tự đăng xuất, nút đăng xuất', () => {
    const props = renderPage({ section: 'account' });
    expect(screen.getByText('Trần Thu Hà')).toBeInTheDocument();
    expect(screen.getByText('@pm.lead')).toBeInTheDocument();
    expect(screen.getByText(/Tự đăng xuất sau 30 phút/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('settings-logout'));
    expect(props.onLogout).toHaveBeenCalled();
  });

  it('Trợ giúp: liệt kê phím tắt và các bước của luồng nghiệp vụ chính', () => {
    renderPage({ section: 'help' });
    expect(screen.getByText(/Mở tìm nhanh/)).toBeInTheDocument();
    expect(screen.getByText(/Thu gọn \/ mở rộng thanh bên/)).toBeInTheDocument();
    expect(screen.getByText('Ghi giờ công và nộp bảng chấm công tuần')).toBeInTheDocument();
  });
});
