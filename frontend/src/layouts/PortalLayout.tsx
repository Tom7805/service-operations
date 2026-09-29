import { useCallback, useEffect, useRef, useState } from 'react';
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

const COLLAPSED_KEY = 'portal.sidebarCollapsed';

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Khung giao diện cổng khách hàng (Epic NCL-13): cùng bộ khung với giao diện nội bộ — thanh bên trái thu/mở
 * được (Ctrl B), tấm nội dung nổi bo tròn, khối tài khoản ở chân thanh bên; trên điện thoại thanh bên nằm ngang
 * như bản nội bộ. Nội dung vẫn tách hẳn: chỉ các mục của cổng, không bảng lệnh hay chuông thông báo nội bộ.
 */
export default function PortalLayout({ fullName, username, navItems, onChangePassword, onLogout, children }: Props) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // Không lưu được (chế độ riêng tư) thì chỉ giữ trong phiên này.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [toggleCollapsed]);

  return (
    <div className="app-frame" data-testid="portal-shell">
      <a className="skip-link" href="#noi-dung-chinh">Bỏ qua điều hướng, tới nội dung chính</a>
      <div className="app-shell">
        <aside className={`side-nav ${collapsed ? 'side-nav--collapsed' : ''}`}>
          <div className="side-nav__header">
            <div className="side-nav__brand">
              <span className="side-nav__brand-mark">
                <i />
                <i />
                <i />
              </span>
              {!collapsed && (
                <span className="side-nav__brand-text">
                  Vận hành <b>dịch vụ</b>
                </span>
              )}
            </div>
            <button
              type="button"
              className="side-nav__toggle"
              onClick={toggleCollapsed}
              title={`${collapsed ? 'Mở rộng' : 'Thu gọn'} thanh bên (Ctrl B)`}
              aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            >
              {ICONS.panelToggle}
            </button>
          </div>

          <nav className="side-nav__list" aria-label="Điều hướng cổng khách hàng">
            <div className="side-nav__group" role="group" aria-label="Cổng khách hàng">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`side-nav__item ${item.active ? 'side-nav__item--active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  aria-current={item.active ? 'page' : undefined}
                  onClick={item.onSelect}
                  data-testid={`portal-nav-${item.key}`}
                >
                  <span className="side-nav__item__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {!collapsed && <span className="side-nav__item__label">{item.label}</span>}
                  {item.badge ? (
                    <span
                      className="side-nav__badge"
                      data-testid={`portal-nav-badge-${item.key}`}
                      aria-label={`${item.badge} mục chờ xử lý`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </nav>

          <div className="side-nav__footer">
            <div className="side-nav__account" ref={menuRef}>
              <button
                type="button"
                className={`side-nav__account-trigger ${menuOpen ? 'side-nav__account-trigger--open' : ''}`}
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Tài khoản: ${fullName}`}
                title={collapsed ? fullName : undefined}
                data-testid="portal-user-menu"
              >
                <span className="avatar-circle">{initials(fullName)}</span>
                {!collapsed && (
                  <>
                    <span className="side-nav__account-text">
                      <strong>{fullName}</strong>
                      <span>Khách hàng</span>
                    </span>
                    <span className="side-nav__account-more" aria-hidden="true">{ICONS.moreHorizontal}</span>
                  </>
                )}
              </button>

              {menuOpen && (
                <div className="user-chip__menu side-nav__account-menu" role="menu">
                  <div className="user-chip__menu-header">
                    <strong>{fullName}</strong>
                    <span>@{username}</span>
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
        </aside>

        <div className="app-main">
          <main className="app-content portal-content" id="noi-dung-chinh" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
