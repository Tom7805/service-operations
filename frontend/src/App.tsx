import { useEffect, useRef, useState } from 'react';
import LoginPage from './modules/auth/pages/LoginPage';
import type { AuthSession } from './modules/auth/types/authTypes';
import UserListPage from './modules/users/pages/UserListPage';
import UserDetailPage from './modules/users/pages/UserDetailPage';
import RolePermissionPage from './modules/users/pages/RolePermissionPage';
import DepartmentTreePage from './modules/departments/pages/DepartmentTreePage';
import MaskingRulePage from './modules/masking/pages/MaskingRulePage';
import SensitiveAccessLogPage from './modules/auditLog/pages/SensitiveAccessLogPage';
import EmployeeListPage from './modules/employees/pages/EmployeeListPage';
import EmployeeDetailPage from './modules/employees/pages/EmployeeDetailPage';
import ChangePasswordPage from './modules/auth/pages/ChangePasswordPage';
import TwoFactorSetupPage from './modules/auth/pages/TwoFactorSetupPage';
import CustomerListPage from './modules/customers/pages/CustomerListPage';
import CustomerMergePage from './modules/customers/pages/CustomerMergePage';
import { ICONS } from './components/common/icons';
import type { ReactNode } from 'react';

type Tab =
  | 'CUSTOMERS'
  | 'CUSTOMER_MERGE'
  | 'DEPARTMENTS'
  | 'PERMISSIONS'
  | 'USERS'
  | 'DETAIL'
  | 'MASKING'
  | 'AUDIT_LOG'
  | 'EMPLOYEES'
  | 'EMPLOYEE_DETAIL'
  | 'CHANGE_PASSWORD'
  | 'TWO_FACTOR_SETTINGS';

interface NavItem {
  tab: Tab;
  icon: ReactNode;
  label: string;
  /** Các tab con cũng nên tô sáng mục điều hướng này (ví dụ trang chi tiết). */
  matches?: Tab[];
}

/** Thanh điều hướng dạng pill nằm ngang — nhãn rút gọn để vừa một hàng, đầy đủ ngữ cảnh nằm trong tiêu đề từng trang. */
const NAV_ITEMS: NavItem[] = [
  { tab: 'CUSTOMERS', icon: ICONS.building, label: 'Khách hàng' },
  { tab: 'CUSTOMER_MERGE', icon: ICONS.merge, label: 'Gộp KH trùng' },
  { tab: 'DEPARTMENTS', icon: ICONS.tree, label: 'Tổ chức' },
  { tab: 'USERS', icon: ICONS.user, label: 'Tài khoản', matches: ['DETAIL'] },
  { tab: 'EMPLOYEES', icon: ICONS.users, label: 'Nhân sự', matches: ['EMPLOYEE_DETAIL'] },
  { tab: 'PERMISSIONS', icon: ICONS.shield, label: 'Phân quyền' },
  { tab: 'TWO_FACTOR_SETTINGS', icon: ICONS.key, label: '2FA' },
  { tab: 'MASKING', icon: ICONS.eyeOff, label: 'Che dữ liệu' },
  { tab: 'AUDIT_LOG', icon: ICONS.history, label: 'Nhật ký' },
];

const ROLE_LABELS: Record<string, string> = {
  'VT-01': 'Ban giám đốc',
  'VT-02': 'Quản lý dự án',
  'VT-03': 'Nhân viên chuyên môn',
  'VT-04': 'Nhân viên kinh doanh',
  'VT-05': 'Kế toán',
  'VT-06': 'Nhân sự',
  'VT-07': 'Quản trị viên',
  'VT-08': 'Nhân viên công ty',
  'VT-09': 'Khách hàng',
};

function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem('session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession);
  const [activeTab, setActiveTab] = useState<Tab>('DEPARTMENTS');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'ALL' | 'MENTIONS' | 'SYSTEM'>('ALL');
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleAuthenticated(newSession: AuthSession) {
    localStorage.setItem('token', newSession.accessToken);
    localStorage.setItem('session', JSON.stringify(newSession));
    setSession(newSession);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('session');
    setSession(null);
  }

  if (!session) return <LoginPage onAuthenticated={handleAuthenticated} />;

  // Quyền truy cập luôn theo vai trò thật của tài khoản đang đăng nhập (trả về từ backend lúc dang nhap),
  // khong dung bat ky co che gia lap nao o phia giao dien.
  const currentRoles = session.roles;

  const activeNavItem =
    NAV_ITEMS.find((item) => item.tab === activeTab) ??
    NAV_ITEMS.find((item) => (item.matches ?? []).includes(activeTab));

  return (
    <div className="app-frame">
      <div className="app-shell">
        <div className="app-topbar-glow" aria-hidden="true" />
        <header className="app-topbar">
          <div className="app-topbar__brand">
            <span className="app-topbar__mark">
              <i />
              <i />
              <i />
            </span>
            <h1 className="app-topbar__title">{activeNavItem?.label ?? 'Vận hành dịch vụ'}</h1>
          </div>

          <div className="app-topbar__actions">
            <button type="button" className="icon-btn" title="Trợ giúp" aria-label="Trợ giúp">
              {ICONS.helpCircle}
            </button>
            <div className="notif" ref={notifRef}>
              <button
                type="button"
                className="icon-btn"
                title="Thông báo"
                aria-label="Thông báo"
                aria-haspopup="menu"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((open) => !open)}
              >
                {ICONS.bell}
              </button>

              {notifOpen && (
                <div className="notif-panel" role="menu">
                  <div className="notif-panel__tabs">
                    <button
                      type="button"
                      className={`notif-panel__tab ${notifTab === 'ALL' ? 'notif-panel__tab--active' : ''}`}
                      onClick={() => setNotifTab('ALL')}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`notif-panel__tab ${notifTab === 'MENTIONS' ? 'notif-panel__tab--active' : ''}`}
                      onClick={() => setNotifTab('MENTIONS')}
                    >
                      Nhắc đến
                    </button>
                    <button
                      type="button"
                      className={`notif-panel__tab ${notifTab === 'SYSTEM' ? 'notif-panel__tab--active' : ''}`}
                      onClick={() => setNotifTab('SYSTEM')}
                    >
                      Hệ thống
                    </button>
                    <span className="notif-panel__tabs-spacer" />
                    <span className="notif-panel__chevron">{ICONS.chevronDown}</span>
                  </div>

                  <div className="notif-panel__empty">
                    <span className="notif-panel__empty-icon">{ICONS.bell}</span>
                    <p>Chưa có thông báo nào</p>
                  </div>
                </div>
              )}
            </div>

            <div className="user-chip" ref={userMenuRef}>
              <button
                type="button"
                className={`user-chip__trigger ${userMenuOpen ? 'user-chip__trigger--open' : ''}`}
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="avatar-circle">{getInitials(session.fullName)}</span>
                <span className="user-chip__name">{session.fullName}</span>
                <span className="user-chip__chevron">{ICONS.chevronDown}</span>
              </button>

              {userMenuOpen && (
                <div className="user-chip__menu" role="menu">
                  <div className="user-chip__menu-header">
                    <strong>{session.fullName}</strong>
                    <span>@{session.username}</span>
                    <div className="user-chip__role-badge">
                      <span className="user-chip__role-dot" />
                      <span>{currentRoles.map((role) => ROLE_LABELS[role] ?? role).join(', ')}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="user-chip__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setActiveTab('CHANGE_PASSWORD');
                      setUserMenuOpen(false);
                    }}
                  >
                    {ICONS.key} Đổi mật khẩu
                  </button>
                  <button
                    type="button"
                    className="user-chip__menu-item user-chip__menu-item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    {ICONS.logout} Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <nav className="pill-tabbar" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.tab || (item.matches ?? []).includes(activeTab);
            return (
              <button
                key={item.tab}
                type="button"
                className={`pill-tabbar__item ${isActive ? 'pill-tabbar__item--active' : ''}`}
                onClick={() => setActiveTab(item.tab)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="pill-tabbar__item__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="app-content">
          {activeTab === 'CHANGE_PASSWORD' ? (
            <ChangePasswordPage onBack={() => setActiveTab('DEPARTMENTS')} onPasswordChanged={handleLogout} />
          ) : activeTab === 'CUSTOMERS' ? (
            <CustomerListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
            />
          ) : activeTab === 'CUSTOMER_MERGE' ? (
            <CustomerMergePage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'DEPARTMENTS' ? (
            <DepartmentTreePage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'PERMISSIONS' ? (
            <RolePermissionPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'MASKING' ? (
            <MaskingRulePage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'AUDIT_LOG' ? (
            <SensitiveAccessLogPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'TWO_FACTOR_SETTINGS' ? (
            <TwoFactorSetupPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'EMPLOYEE_DETAIL' && selectedEmployeeId ? (
            <EmployeeDetailPage employeeId={selectedEmployeeId} onBack={() => setActiveTab('EMPLOYEES')} />
          ) : activeTab === 'EMPLOYEES' ? (
            <EmployeeListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onNavigateDetail={(id) => {
                setSelectedEmployeeId(id);
                setActiveTab('EMPLOYEE_DETAIL');
              }}
            />
          ) : activeTab === 'DETAIL' && selectedUserId ? (
            <UserDetailPage userId={selectedUserId} onBack={() => setActiveTab('USERS')} />
          ) : (
            <UserListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onNavigateDetail={(id) => {
                setSelectedUserId(id);
                setActiveTab('DETAIL');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
