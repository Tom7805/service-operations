/** Các mục của trang Cài đặt — tách khỏi SettingsPage để App dùng nhãn (đường dẫn, bảng lệnh) mà không
 *  phải nạp sẵn cả trang Cài đặt (trang được tải theo nhu cầu). */
export type SettingsSection = 'account' | 'appearance' | 'notifications' | 'security' | 'access' | 'help';

export const SETTINGS_SECTION_LABELS: Record<SettingsSection, string> = {
  account: 'Tài khoản',
  appearance: 'Giao diện',
  notifications: 'Thông báo',
  security: 'Bảo mật',
  access: 'Quyền xem dữ liệu',
  help: 'Trợ giúp & phím tắt',
};
