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

type Tab =
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

type SimulatedRole = 'VT-07' | 'VT-03' | 'VT-06';

interface NavItem {
  tab: Tab;
  icon: string;
  label: string;
  /** Các tab con cũng nên tô sáng mục điều hướng này (ví dụ trang chi tiết). */
  matches?: Tab[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Tổ chức',
    items: [
      { tab: 'DEPARTMENTS', icon: '🏛️', label: 'Cây tổ chức' },
      { tab: 'USERS', icon: '👤', label: 'Tài khoản', matches: ['DETAIL'] },
      { tab: 'EMPLOYEES', icon: '🧑‍💼', label: 'Hồ sơ nhân sự', matches: ['EMPLOYEE_DETAIL'] },
    ],
  },
  {
    label: 'Bảo mật & tuân thủ',
    items: [
      { tab: 'PERMISSIONS', icon: '🛡️', label: 'Phân quyền & phạm vi' },
      { tab: 'TWO_FACTOR_SETTINGS', icon: '🔐', label: 'Xác thực hai bước' },
      { tab: 'MASKING', icon: '🕶️', label: 'Che dữ liệu nhạy cảm' },
      { tab: 'AUDIT_LOG', icon: '🕵️', label: 'Nhật ký truy cập' },
    ],
  },
];

/** Tiêu đề hiển thị trên thanh trên cùng — bao gồm cả các tab không có mặt trong sidebar. */
const PAGE_HEADING: Record<Tab, { section: string; title: string }> = {
  DEPARTMENTS: { section: 'Tổ chức', title: 'Cây tổ chức' },
  USERS: { section: 'Tổ chức', title: 'Tài khoản người dùng' },
  DETAIL: { section: 'Tổ chức', title: 'Chi tiết tài khoản' },
  EMPLOYEES: { section: 'Tổ chức', title: 'Hồ sơ nhân sự' },
  EMPLOYEE_DETAIL: { section: 'Tổ chức', title: 'Chi tiết nhân sự' },
  PERMISSIONS: { section: 'Bảo mật & tuân thủ', title: 'Phân quyền & phạm vi dữ liệu' },
  TWO_FACTOR_SETTINGS: { section: 'Bảo mật & tuân thủ', title: 'Xác thực hai bước' },
  MASKING: { section: 'Bảo mật & tuân thủ', title: 'Che dữ liệu nhạy cảm' },
  AUDIT_LOG: { section: 'Bảo mật & tuân thủ', title: 'Nhật ký truy cập' },
  CHANGE_PASSWORD: { section: 'Tài khoản của tôi', title: 'Đổi mật khẩu' },
};

const ROLE_LABELS: Record<SimulatedRole, string> = {
  'VT-07': 'Quản trị viên (VT-07)',
  'VT-06': 'Nhân sự (VT-06)',
  'VT-03': 'Nhân viên chuyên môn (VT-03)',
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
  const [simulatedRole, setSimulatedRole] = useState<SimulatedRole>('VT-07');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
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

  const currentRoles = [simulatedRole];
  const heading = PAGE_HEADING[activeTab];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand__mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            Vận hành <b>dịch vụ</b>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {NAV_GROUPS.map((group) => (
            <div className="sidebar-nav__group" key={group.label}>
              <span className="sidebar-nav__group-label">{group.label}</span>
              {group.items.map((item) => {
                const isActive = activeTab === item.tab || (item.matches ?? []).includes(activeTab);
                return (
                  <button
                    key={item.tab}
                    type="button"
                    className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                    onClick={() => setActiveTab(item.tab)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-link__icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-devmode">
            <div className="sidebar-devmode__label">
              <span className="sidebar-devmode__dot" />
              Giả lập vai trò (demo)
            </div>
            <select
              value={simulatedRole}
              onChange={(e) => setSimulatedRole(e.target.value as SimulatedRole)}
            >
              {(Object.keys(ROLE_LABELS) as SimulatedRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-heading">
            <span className="topbar-heading__section">{heading.section}</span>
            <span className="topbar-heading__title">{heading.title}</span>
          </div>

          <div className="topbar-actions">
            <div className="topbar-user" ref={userMenuRef}>
              <button
                type="button"
                className={`topbar-user__trigger ${userMenuOpen ? 'topbar-user__trigger--open' : ''}`}
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="avatar-circle">{getInitials(session.fullName)}</span>
                <span className="topbar-user__meta">
                  <span className="topbar-user__name">{session.fullName}</span>
                  <span className="topbar-user__role">@{session.username}</span>
                </span>
                <span className="topbar-user__chevron">▾</span>
              </button>

              {userMenuOpen && (
                <div className="topbar-user__menu" role="menu">
                  <div className="topbar-user__menu-header">
                    <strong>{session.fullName}</strong>
                    <span>@{session.username}</span>
                  </div>
                  <button
                    type="button"
                    className="topbar-user__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setActiveTab('CHANGE_PASSWORD');
                      setUserMenuOpen(false);
                    }}
                  >
                    🔑 Đổi mật khẩu
                  </button>
                  <button
                    type="button"
                    className="topbar-user__menu-item topbar-user__menu-item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    ↪ Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-content">
          {activeTab === 'CHANGE_PASSWORD' ? (
            <ChangePasswordPage onBack={() => setActiveTab('DEPARTMENTS')} onPasswordChanged={handleLogout} />
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
