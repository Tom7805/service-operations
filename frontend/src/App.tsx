import { useEffect, useRef, useState } from 'react';
import LoginPage from './modules/auth/pages/LoginPage';
import type { AuthSession } from './modules/auth/types/authTypes';
import UserListPage from './modules/users/pages/UserListPage';
import UserDetailPage from './modules/users/pages/UserDetailPage';
import RolePermissionPage from './modules/users/pages/RolePermissionPage';
import DepartmentTreePage from './modules/departments/pages/DepartmentTreePage';
import SensitiveAccessLogPage from './modules/auditLog/pages/SensitiveAccessLogPage';
import AuditLogPage from './modules/auditLog/pages/AuditLogPage';
import EmployeeListPage from './modules/employees/pages/EmployeeListPage';
import EmployeeDetailPage from './modules/employees/pages/EmployeeDetailPage';
import ChangePasswordPage from './modules/auth/pages/ChangePasswordPage';
import TwoFactorSetupPage from './modules/auth/pages/TwoFactorSetupPage';
import CustomerListPage from './modules/customers/pages/CustomerListPage';
import CustomerMergePage from './modules/customers/pages/CustomerMergePage';
import OpportunityDetailPage from './modules/opportunities/pages/OpportunityDetailPage';
import OpportunityListPage from './modules/opportunities/pages/OpportunityListPage';
import RevenueForecastPage from './modules/opportunities/pages/RevenueForecastPage';
import { ICONS } from './components/common/icons';
import CommandPalette from './components/common/CommandPalette';
import useScrollReveal from './hooks/useScrollReveal';
import { useSessionSync } from './hooks/useSessionSync';
import type { ReactNode } from 'react';

type Tab =
  | 'CUSTOMERS'
  | 'OPPORTUNITIES'
  | 'REVENUE_FORECAST'
  | 'CUSTOMER_MERGE'
  | 'DEPARTMENTS'
  | 'PERMISSIONS'
  | 'USERS'
  | 'DETAIL'
  | 'AUDIT_LOG'
  | 'SYSTEM_AUDIT_LOG'
  | 'EMPLOYEES'
  | 'EMPLOYEE_DETAIL'
  | 'OPPORTUNITY_DETAIL'
  | 'CHANGE_PASSWORD'
  | 'TWO_FACTOR_SETTINGS';

interface NavItem {
  tab: Tab;
  icon: ReactNode;
  label: string;
  /** Các tab con cũng nên tô sáng mục điều hướng này (ví dụ trang chi tiết). */
  matches?: Tab[];
  /**
   * Vai trò cần có để dùng được màn hình này. CHỈ dùng để hiển thị chỉ báo khóa
   * trên menu — cổng bảo mật thật vẫn nằm trong từng trang và ở backend, không
   * đổi. Mục đích duy nhất: người dùng biết TRƯỚC khi bấm, thay vì bấm vào rồi
   * mới gặp ngõ cụt.
   */
  requires?: string[];
}

/** Điều hướng chính — vận hành nghiệp vụ hàng ngày. */
const NAV_ITEMS: NavItem[] = [
  { tab: 'CUSTOMERS', icon: ICONS.building, label: 'Khách hàng', requires: ['VT-04', 'VT-02'] },
  { tab: 'OPPORTUNITIES', icon: ICONS.target, label: 'Cơ hội bán hàng', requires: ['VT-04'] },
  { tab: 'REVENUE_FORECAST', icon: ICONS.chart, label: 'Dự báo doanh thu', requires: ['VT-01', 'VT-04'] },
  { tab: 'CUSTOMER_MERGE', icon: ICONS.merge, label: 'Gộp KH trùng', requires: ['VT-07'] },
  { tab: 'DEPARTMENTS', icon: ICONS.tree, label: 'Tổ chức', requires: ['VT-07'] },
  { tab: 'USERS', icon: ICONS.user, label: 'Tài khoản', matches: ['DETAIL'], requires: ['VT-07'] },
  { tab: 'EMPLOYEES', icon: ICONS.users, label: 'Nhân sự', matches: ['EMPLOYEE_DETAIL'], requires: ['VT-06', 'VT-07'] },
  { tab: 'OPPORTUNITY_DETAIL', icon: ICONS.building, label: 'Cơ hội', requires: ['VT-04'] },
  { tab: 'PERMISSIONS', icon: ICONS.shield, label: 'Phân quyền', requires: ['VT-07'] },
];

/** Bảo mật & Hệ thống — nhóm riêng, tách khỏi điều hướng nghiệp vụ hàng ngày (theo mẫu "Favorites"
 * của tham chiếu: một nhãn xám nhỏ đứng trên nhóm mục phụ). */
const SYSTEM_NAV_ITEMS: NavItem[] = [
  { tab: 'TWO_FACTOR_SETTINGS', icon: ICONS.key, label: '2FA', requires: ['VT-07'] },
  { tab: 'SYSTEM_AUDIT_LOG', icon: ICONS.history, label: 'Nhật ký hệ thống', requires: ['VT-07'] },
  { tab: 'AUDIT_LOG', icon: ICONS.shieldOff, label: 'Dữ liệu nhạy cảm', requires: ['VT-07'] },
];

const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, ...SYSTEM_NAV_ITEMS];

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
  const [opportunityIdInput, setOpportunityIdInput] = useState('');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'ALL' | 'MENTIONS' | 'SYSTEM'>('ALL');
  const notifRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('sidebarCollapsed') === '1'
  );

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  // Quet lai cac khoi "he lo khi cuon toi" moi lan doi trang.
  useScrollReveal(activeTab);

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

  function persistSession(next: AuthSession) {
    localStorage.setItem('token', next.accessToken);
    localStorage.setItem('session', JSON.stringify(next));
    setSession(next);
  }

  function handleAuthenticated(newSession: AuthSession) {
    persistSession(newSession);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('session');
    setSession(null);
  }

  // NCL-01-CN-004 TC-03: admin đổi vai trò ở tab/máy khác → phiên này áp dụng ngay
  // (làm mới khi focus lại + poll 30s), không bắt đăng nhập lại; 401 thì đăng xuất.
  useSessionSync({ session, onRefresh: persistSession, onExpired: handleLogout });

  if (!session) return <LoginPage onAuthenticated={handleAuthenticated} />;

  // Quyền truy cập luôn theo vai trò thật của tài khoản đang đăng nhập (trả về từ backend lúc dang nhap),
  // khong dung bat ky co che gia lap nao o phia giao dien.
  const currentRoles = session.roles;

  const activeNavItem =
    ALL_NAV_ITEMS.find((item) => item.tab === activeTab) ??
    ALL_NAV_ITEMS.find((item) => (item.matches ?? []).includes(activeTab));

  /** Chỉ để hiển thị. Cổng bảo mật thật nằm trong từng trang và ở backend. */
  const canAccess = (item: NavItem) =>
    !item.requires || item.requires.some((r) => currentRoles.includes(r));

  const renderNavGroup = (items: NavItem[]) =>
    items.map((item) => {
      const isActive = activeTab === item.tab || (item.matches ?? []).includes(activeTab);
      const locked = !canAccess(item);
      return (
        <button
          key={item.tab}
          type="button"
          className={`side-nav__item ${isActive ? 'side-nav__item--active' : ''} ${locked ? 'side-nav__item--locked' : ''}`}
          onClick={() => setActiveTab(item.tab)}
          aria-current={isActive ? 'page' : undefined}
          title={locked ? `${item.label} — cần vai trò khác` : (sidebarCollapsed ? item.label : undefined)}
        >
          <span className="side-nav__item__icon" aria-hidden="true">
            {item.icon}
          </span>
          {!sidebarCollapsed && <span className="side-nav__item__label">{item.label}</span>}
          {!sidebarCollapsed && locked && (
            <span className="side-nav__item__lock" aria-label="Cần vai trò khác">
              {ICONS.lock}
            </span>
          )}
        </button>
      );
    });

  return (
    <div className="app-frame">
      {/* Nguoi dung ban phim khong phai Tab qua ca menu dieu huong moi toi duoc noi dung. */}
      <a className="skip-link" href="#noi-dung-chinh">Bỏ qua điều hướng, tới nội dung chính</a>

      {/* Bảng lệnh Ctrl/⌘+K — nhảy tới bất kỳ màn hình nào không cần rời bàn phím. */}
      <CommandPalette
        items={[
          ...NAV_ITEMS.map((i) => ({ id: i.tab, label: i.label, group: 'Điều hướng', icon: i.icon })),
          ...SYSTEM_NAV_ITEMS.map((i) => ({ id: i.tab, label: i.label, group: 'Bảo mật & hệ thống', icon: i.icon })),
          { id: 'CHANGE_PASSWORD', label: 'Đổi mật khẩu', group: 'Tài khoản của tôi', icon: ICONS.key },
        ]}
        onSelect={(id) => setActiveTab(id as Tab)}
      />

      <div className="app-shell">
        <aside className={`side-nav ${sidebarCollapsed ? 'side-nav--collapsed' : ''}`}>
          <div className="side-nav__header">
            <div className="side-nav__brand">
              <span className="side-nav__brand-mark">
                <i />
                <i />
                <i />
              </span>
              {!sidebarCollapsed && (
                <span className="side-nav__brand-text">
                  Vận hành <b>dịch vụ</b>
                </span>
              )}
            </div>
            <button
              type="button"
              className="side-nav__toggle"
              onClick={() => setSidebarCollapsed((v) => !v)}
              title={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-label={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            >
              {ICONS.panelToggle}
            </button>
          </div>

          <nav className="side-nav__list" aria-label="Điều hướng chính">
            {renderNavGroup(NAV_ITEMS)}

            <div className="side-nav__group-label">{!sidebarCollapsed ? 'Bảo mật & Hệ thống' : ''}</div>
            {renderNavGroup(SYSTEM_NAV_ITEMS)}
          </nav>
        </aside>

        <div className="app-main">
        <div className="app-topbar-glow" aria-hidden="true" />
        <header className="app-topbar">
          <div className="app-topbar__brand">
            <h1 className="app-topbar__title">{activeNavItem?.label ?? 'Vận hành dịch vụ'}</h1>
          </div>

          <div className="app-topbar__actions">
            {/* Phím tắt phải nhìn thấy được thì mới có người dùng. Nút này vừa là chỉ dẫn,
                vừa là lối vào cho người dùng chuột. */}
            <button
              type="button"
              className="cmdk-hint"
              title="Mở bảng lệnh (Ctrl K)"
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            >
              {ICONS.search}
              <span>Tìm nhanh</span>
              <kbd className="cmdk__kbd">Ctrl K</kbd>
            </button>
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

        {/* key doi theo tab: React thay toan bo cay con, nen hieu ung xo theo tang
            chay lai o MOI lan chuyen trang chu khong chi lan tai dau tien. */}
        <main className="app-content" id="noi-dung-chinh" tabIndex={-1} key={activeTab}>
          {activeTab === 'CHANGE_PASSWORD' ? (
            <ChangePasswordPage onBack={() => setActiveTab('DEPARTMENTS')} onPasswordChanged={handleLogout} />
          ) : activeTab === 'CUSTOMERS' ? (
            <CustomerListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
            />
          ) : activeTab === 'OPPORTUNITIES' ? (
            <OpportunityListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
            />
          ) : activeTab === 'REVENUE_FORECAST' ? (
            <RevenueForecastPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
            />
          ) : activeTab === 'CUSTOMER_MERGE' ? (
            <CustomerMergePage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'DEPARTMENTS' ? (
            <DepartmentTreePage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'PERMISSIONS' ? (
            <RolePermissionPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onViewAuditLog={() => setActiveTab('SYSTEM_AUDIT_LOG')}
            />
          ) : activeTab === 'SYSTEM_AUDIT_LOG' ? (
            <AuditLogPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
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
          ) : activeTab === 'OPPORTUNITY_DETAIL' ? (
            selectedOpportunityId ? (
              <OpportunityDetailPage
                opportunityId={selectedOpportunityId}
                currentUserRoles={currentRoles}
                currentUserName={session.fullName}
              />
            ) : (
              <div className="opportunity-id-picker">
                <h2>Ghi nhận hoạt động chăm sóc cơ hội</h2>
                <p>Nhập mã cơ hội để xem lịch sử và ghi nhận hoạt động chăm sóc.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const id = Number(opportunityIdInput);
                    if (Number.isInteger(id) && id > 0) setSelectedOpportunityId(id);
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    value={opportunityIdInput}
                    onChange={(e) => setOpportunityIdInput(e.target.value)}
                    placeholder="Mã cơ hội"
                    aria-label="Mã cơ hội"
                  />
                  <button type="submit" className="btn btn-primary">Mở cơ hội</button>
                </form>
              </div>
            )
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
              onViewAuditLog={() => setActiveTab('SYSTEM_AUDIT_LOG')}
            />
          )}
        </main>
        </div>
      </div>
    </div>
  );
}
