import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ICONS } from '../components/common/icons';

export interface PortalNavItem {
  key: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  /** Số hiển thị trên mục (vd phiếu chờ xác nhận); 0/không đặt thì ẩn. */
  badge?: number;
  onSelect: () => void;
}

interface Props {
  fullName: string;
  username: string;
  navItems: PortalNavItem[];
  onChangePassword: () => void;
  onLogout: () => void;
  children: ReactNode;
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Khung giao diện riêng của cổng khách hàng (Epic NCL-13) — tách hẳn khỏi giao diện nội bộ: không có thanh điều hướng
 * nghiệp vụ, bảng lệnh hay chuông thông báo nội bộ; khách hàng chỉ thấy các mục của cổng.
 */
export default function PortalLayout({ fullName, username, navItems, onChangePassword, onLogout, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="portal-shell" data-testid="portal-shell">
      <header className="portal-topbar">
        <div className="portal-topbar__inner">
          <div className="portal-topbar__brand">
            <span className="portal-topbar__mark" aria-hidden="true">{ICONS.globe}</span>
            <span>
              <strong>Cổng khách hàng</strong>
              <span className="portal-topbar__sub">Vận hành dịch vụ</span>
            </span>
          </div>
          <nav className="portal-topbar__nav" aria-label="Điều hướng cổng khách hàng">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`portal-topbar__link${item.active ? ' portal-topbar__link--active' : ''}`}
                aria-current={item.active ? 'page' : undefined}
                onClick={item.onSelect}
              >
                <span className="icon-xs">{item.icon}</span> {item.label}
                {item.badge ? (
                  <span className="portal-topbar__badge" data-testid={`portal-nav-badge-${item.key}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="user-chip" ref={menuRef}>
            <button
              type="button"
              className={`user-chip__trigger ${menuOpen ? 'user-chip__trigger--open' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              data-testid="portal-user-menu"
            >
              <span className="avatar-circle">{initials(fullName)}</span>
              <span className="user-chip__name">{fullName}</span>
              <span className="user-chip__chevron">{ICONS.chevronDown}</span>
            </button>
            {menuOpen && (
              <div className="user-chip__menu" role="menu">
                <div className="user-chip__menu-header">
                  <strong>{fullName}</strong>
                  <span>@{username}</span>
                  <div className="user-chip__role-badge">
                    <span className="user-chip__role-dot" />
                    <span>Khách hàng</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="user-chip__menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onChangePassword();
                  }}
                >
                  {ICONS.key} Đổi mật khẩu
                </button>
                <button
                  type="button"
                  className="user-chip__menu-item user-chip__menu-item--danger"
                  role="menuitem"
                  onClick={onLogout}
                  data-testid="portal-logout"
                >
                  {ICONS.logout} Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="portal-content" id="noi-dung-chinh" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
