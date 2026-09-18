import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
import ContractListPage from './modules/contracts/pages/ContractListPage';
import BillRatePage from './modules/rates/pages/BillRatePage';
import RateHistoryPage from './modules/rates/pages/RateHistoryPage';
import OpportunityDetailPage from './modules/opportunities/pages/OpportunityDetailPage';
import OpportunitySearchPicker from './modules/opportunities/components/OpportunitySearchPicker';
import OpportunityListPage from './modules/opportunities/pages/OpportunityListPage';
import RevenueForecastPage from './modules/opportunities/pages/RevenueForecastPage';
import PipelineReportPage from './modules/reports/pages/PipelineReportPage';
import MyWorkPage from './modules/mytasks/pages/MyWorkPage';
import TimesheetApprovalPage from './modules/timesheets/pages/TimesheetApprovalPage';
import TimesheetRejectPage from './modules/timesheets/pages/TimesheetRejectPage';
import TimesheetAdjustmentPage from './modules/timesheets/pages/TimesheetAdjustmentPage';
import TimesheetPeriodPage from './modules/timesheets/pages/TimesheetPeriodPage';
import UnsubmittedTimesheetsPage from './modules/timesheets/pages/UnsubmittedTimesheetsPage';
import ExpenseApprovalPage from './modules/expenses/pages/ExpenseApprovalPage';
import OverheadAllocationPage from './modules/expenses/pages/OverheadAllocationPage';
import ProjectLaborCostPage from './modules/profitability/pages/ProjectLaborCostPage';
import ProjectRecognizedRevenuePage from './modules/profitability/pages/ProjectRecognizedRevenuePage';
import ProjectMarginPage from './modules/profitability/pages/ProjectMarginPage';
import MarginAlertThresholdPage from './modules/profitability/pages/MarginAlertThresholdPage';
import NotificationCenterPage from './modules/notifications/pages/NotificationCenterPage';
import NotificationList from './modules/notifications/components/NotificationList';
import { getNotifications, getUnreadCount, markNotificationsRead } from './modules/notifications/api/notificationsApi';
import type { NotificationRes } from './modules/notifications/types/notificationTypes';
import { ICONS } from './components/common/icons';
import CommandPalette from './components/common/CommandPalette';
import useScrollReveal from './hooks/useScrollReveal';
import { roleLabels } from './utils/roleLabel';
import { useSessionSync } from './hooks/useSessionSync';
import {
  Tab,
  NavItem,
  ALL_NAV_ITEMS,
  canAccess,
  navGroupsFor,
  defaultTabFor,
  isTabVisible,
} from './layouts/menuConfig';

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
  // Tab mặc định luôn là mục người dùng thấy được — tránh đưa ngay vào "Tổ
  // chức" (chỉ dành cho VT-07) rồi báo "Không có thẩm quyền" ngay khi đăng nhập.
  const [activeTab, setActiveTab] = useState<Tab>(() => defaultTabFor(readStoredSession()?.roles ?? []));
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Mock danh sách dự án — thay thế bằng GET /projects khi có API danh sách dự án.
  const mockProjects: { id: number; projectCode: string; name: string }[] = [
    { id: 1, projectCode: 'PRJ-2026-001', name: 'Triển khai CRM cho Khách hàng Alpha' },
    { id: 2, projectCode: 'PRJ-2026-002', name: 'Nâng cấp hệ thống ERP doanh thu' },
    { id: 3, projectCode: 'PRJ-2026-003', name: 'Triển khai giải pháp thanh toán số' },
  ];
  const [selectedOpportunityName, setSelectedOpportunityName] = useState<string | undefined>(undefined);
  /** Nhớ người dùng vào màn "Ghi nhận chăm sóc" từ đâu để nút quay lại trả về
   *  đúng chỗ: từ danh sách "Cơ hộp bán hàng" thì về lại danh sách, còn tự tìm
   *  trực tiếp trong tab "Cơ hộp" thì quay về ô tìm kiếm. */
  const [activityOrigin, setActivityOrigin] = useState<'LIST' | 'PICKER' | null>(null);
  /** Từ báo cáo đường ống, bấm vào một cơ hộp đọng lâu thì nhảy sang "Cơ hộp
   *  bán hàng" và tự mở đúng cơ hộp đó lên để xử lý ngay (chuyển giai đoạn/
   *  chốt kết quả), thay vì chỉ biết mỗi con số ID không thao tác được gì. */
  const [focusOpportunityId, setFocusOpportunityId] = useState<number | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<NotificationRes[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

  // NCL-06-CN-009: chấm đỏ trên chuông thông báo phản ánh đúng số chưa đọc thật (gồm cả
  // TIMESHEET_REMINDER) — nạp ngay khi đăng nhập rồi làm mới định kỳ mỗi 30 giây.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const count = await getUnreadCount();
        if (!cancelled) setUnreadCount(count);
      } catch {
        // Bỏ qua lỗi đếm chưa đọc — không làm gián đoạn trải nghiệm chính.
      }
    };
    void fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session]);

  // Nạp danh sách thông báo thật khi mở ô chuông hoặc đổi tab Tất cả/Chưa đọc.
  useEffect(() => {
    if (!session || !notifOpen) return;
    let cancelled = false;
    setNotifLoading(true);
    getNotifications(notifTab === 'UNREAD', 0, 8)
      .then((data) => {
        if (!cancelled) setNotifications(data);
      })
      .catch(() => {
        if (!cancelled) setNotifications([]);
      })
      .finally(() => {
        if (!cancelled) setNotifLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, notifOpen, notifTab]);

  async function handleMarkNotificationRead(notification: NotificationRes) {
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationsRead([notification.id]);
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: false } : n)));
      setUnreadCount((c) => c + 1);
    }
  }

  // Quyền truy cập luôn theo vai trò thật của tài khoản đang đăng nhập (trả về từ backend lúc dang nhap),
  // khong dung bat ky co che gia lap nao o phia giao dien.
  // Dùng mảng rỗng khi chưa đăng nhập (không được `return` sớm ở đây) — các hook
  // ngay dưới PHẢI luôn được gọi theo đúng thứ tự ở mọi lần render, kể cả khi
  // `session` vừa chuyển null → có giá trị (đăng nhập) hoặc ngược lại (đăng
  // xuất). `return` sớm trước những hook này từng làm số hook gọi được thay đổi
  // giữa hai lần render liên tiếp, khiến React ném lỗi "Rendered more hooks than
  // during the previous render" và toàn bộ ứng dụng trắng trang — chỉ tải lại
  // trang (mount mới) mới hết vì lúc đó không còn xảy ra chuyển trạng thái nữa.
  const currentRoles = session?.roles ?? [];

  // Vai trò mới (đăng nhập / làm mới qua useSessionSync) → tab mở rộng mỗi lần
  // đổi trang. useSessionSync làm mới khi focus lại + poll 30s; 401 thì đăng xuất.
  const defaultTab = useMemo(() => defaultTabFor(currentRoles), [currentRoles]);
  useEffect(() => {
    if (!isTabVisible(activeTab, currentRoles)) {
      setActiveTab(defaultTab);
    }
    // Chỉ kiểm tra lại khi vai trò thay đổi — tránh đẩy lùi khi chỉ chuyển tab con.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoles, defaultTab]);

  // Sidebar + bảng lệnh chỉ liệt kê chức năng người dùng thực sự thấy được
  // (có quyền, hoặc ở chế độ chỉ xem). Các mục bị khóa hoàn toàn không hiện ra.
  const navGroups = useMemo(() => navGroupsFor(currentRoles), [currentRoles]);

  if (!session) return <LoginPage onAuthenticated={handleAuthenticated} />;

  const activeNavItem =
    ALL_NAV_ITEMS.find((item) => item.tab === activeTab) ??
    ALL_NAV_ITEMS.find((item) => (item.matches ?? []).includes(activeTab));

  const renderNavGroup = (items: NavItem[]) =>
    items.map((item) => {
      const isActive = activeTab === item.tab || (item.matches ?? []).includes(activeTab);
      // `items` ở đây luôn là mục đã lọc theo vai trò (qua navGroupsFor), nên không
      // còn mục bị khóa hoàn toàn. Chỉ mục "chỉ xem" (viewOnlyHint) vẫn hiện — người
      // dùng vẫn xem được đường ống bán hàng; mục chặn hẳn đã ẩn ở navGroupsFor.
      const isViewOnlyForUser = !canAccess(item, currentRoles) && Boolean(item.viewOnlyHint);
      const title = isViewOnlyForUser ? item.viewOnlyHint : sidebarCollapsed ? item.label : undefined;
      return (
        <button
          key={item.tab}
          type="button"
          className={`side-nav__item ${isActive ? 'side-nav__item--active' : ''}`}
          title={title}
          onClick={() => setActiveTab(item.tab)}
          aria-current={isActive ? 'page' : undefined}
        >
          <span className="side-nav__item__icon" aria-hidden="true">
            {item.icon}
          </span>
          {!sidebarCollapsed && <span className="side-nav__item__label">{item.label}</span>}
          {!sidebarCollapsed && isViewOnlyForUser && (
            <span className="side-nav__item__view-only" aria-label="Chế độ chỉ xem">
              Chỉ xem
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
          ...navGroups.flatMap((group) =>
            group.items.map((i) => ({ id: i.tab, label: i.label, group: group.paletteLabel, icon: i.icon })),
          ),
          { id: 'CHANGE_PASSWORD', label: 'Đổi mật khẩu', group: 'Tài khoản của tôi', icon: ICONS.key },
          { id: 'NOTIFICATIONS', label: 'Thông báo', group: 'Tài khoản của tôi', icon: ICONS.bell },
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

          <nav className="side-nav__list" aria-label="Điều hưừng chính">
            {navGroups.map((group) => (
              <Fragment key={group.id}>
                {group.label !== null && (
                  <div className="side-nav__group-label">{!sidebarCollapsed ? group.label : ''}</div>
                )}
                {renderNavGroup(group.items)}
              </Fragment>
            ))}
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
                data-testid="btn-notif-bell"
              >
                {ICONS.bell}
                {unreadCount > 0 && (
                  <span className="notif-badge" data-testid="notif-unread-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="notif-panel" role="menu" data-testid="notif-panel">
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
                      className={`notif-panel__tab ${notifTab === 'UNREAD' ? 'notif-panel__tab--active' : ''}`}
                      onClick={() => setNotifTab('UNREAD')}
                      data-testid="notif-tab-unread"
                    >
                      Chưa đọc
                    </button>
                    <span className="notif-panel__tabs-spacer" />
                  </div>

                  {notifLoading ? (
                    <div className="notif-panel__empty">
                      <p>Đang tải…</p>
                    </div>
                  ) : (
                    <NotificationList notifications={notifications} onMarkRead={handleMarkNotificationRead} />
                  )}

                  <button
                    type="button"
                    className="btn-link"
                    style={{ width: '100%', textAlign: 'center', padding: '12px', borderTop: '1px solid #F1F0EE' }}
                    onClick={() => {
                      setNotifOpen(false);
                      setActiveTab('NOTIFICATIONS');
                    }}
                  >
                    Xem tất cả thông báo
                  </button>
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
                      <span>{roleLabels(currentRoles)}</span>
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
            <ChangePasswordPage onBack={() => setActiveTab(defaultTab)} onPasswordChanged={handleLogout} />
          ) : activeTab === 'NOTIFICATIONS' ? (
            <NotificationCenterPage />
          ) : activeTab === 'MY_WORK' ? (
            <MyWorkPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'TIMESHEET_APPROVAL' ? (
            <TimesheetApprovalPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'TIMESHEET_REJECT' ? (
            <TimesheetRejectPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'TIMESHEET_ADJUSTMENT' ? (
            <TimesheetAdjustmentPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'TIMESHEET_PERIOD' ? (
            <TimesheetPeriodPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'UNSUBMITTED_TIMESHEETS' ? (
            <UnsubmittedTimesheetsPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'EXPENSE_APPROVAL' ? (
            <ExpenseApprovalPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'OVERHEAD_ALLOCATION' ? (
            <OverheadAllocationPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'PROJECT_RECOGNIZED_REVENUE' && selectedProjectId ? (
            <ProjectRecognizedRevenuePage
              projectId={selectedProjectId}
              currentUserRoles={currentRoles}
              onBack={() => { setSelectedProjectId(null); }}
            />
          ) : activeTab === 'PROJECT_RECOGNIZED_REVENUE' ? (
            <div className="user-management-page">
              <div className="page-header">
                <div>
                  <div className="page-header__kicker">
                    <span className="page-header__tag">{ICONS.chart} DOANH THU GHI NHẬN</span>
                    <span className="page-header__dot" />
                    <span className="page-header__meta">CHƯA CHỌN DỰ ÁN</span>
                  </div>
                  <h1 className="page-title">Doanh thu ghi nhận dự án</h1>
                  <p className="page-subtitle">
                    Chọn một dự án để xem doanh thu ghi nhận.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <select
                  className="form-select"
                  style={{ padding: '8px 12px', fontSize: '14px', minWidth: '320px' }}
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) setSelectedProjectId(Number(val));
                  }}
                  data-testid="project-selector-dropdown"
                >
                  <option value="" disabled>
                    -- Chọn dự án --
                  </option>
                  {mockProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.projectCode} — {proj.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeTab === 'PROJECT_MARGIN' && selectedProjectId ? (
            <ProjectMarginPage
              projectId={selectedProjectId}
              currentUserRoles={currentRoles}
              onBack={() => { setSelectedProjectId(null); }}
            />
          ) : activeTab === 'PROJECT_MARGIN' ? (
            <div className="user-management-page">
              <div className="page-header">
                <div>
                  <div className="page-header__kicker">
                    <span className="page-header__tag">{ICONS.chart} BIÊN LỢI NHUẬN</span>
                    <span className="page-header__dot" />
                    <span className="page-header__meta">CHƯA CHỌN DỰ ÁN</span>
                  </div>
                  <h1 className="page-title">Biên lợi nhuận thời gian thực</h1>
                  <p className="page-subtitle">
                    Chọn một dự án để xem biên lợi nhuận.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <select
                  className="form-select"
                  style={{ padding: '8px 12px', fontSize: '14px', minWidth: '320px' }}
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) setSelectedProjectId(Number(val));
                  }}
                  data-testid="project-selector-dropdown"
                >
                  <option value="" disabled>
                    -- Chọn dự án --
                  </option>
                  {mockProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.projectCode} — {proj.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeTab === 'MARGIN_ALERT_THRESHOLD' ? (
            <MarginAlertThresholdPage currentUserRoles={currentRoles} />
          ) : activeTab === 'CUSTOMERS' ? (
            <CustomerListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              currentUserId={session.userId}
            />
          ) : activeTab === 'CONTRACTS' ? (
            <ContractListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
            />
          ) : activeTab === 'OPPORTUNITIES' ? (
            <OpportunityListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onOpenActivities={(id, name) => {
                setSelectedOpportunityId(id);
                setSelectedOpportunityName(name);
                setActivityOrigin('LIST');
                setActiveTab('OPPORTUNITY_DETAIL');
              }}
              focusOpportunityId={focusOpportunityId}
              onFocusConsumed={() => setFocusOpportunityId(null)}
            />
          ) : activeTab === 'REVENUE_FORECAST' ? (
            <RevenueForecastPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
            />
          ) : activeTab === 'REPORTS' ? (
            <div className="user-management-page">
              <div className="page-header">
                <div>
                  <div className="page-header__kicker">
                    <span className="page-header__tag">{ICONS.document} VẬN HÀNH</span>
                    <span className="page-header__dot" />
                    <span className="page-header__meta">TRUNG TÂM BÁO CÁO</span>
                  </div>
                  <h1 className="page-title">Báo cáo</h1>
                  <p className="page-subtitle">
                    Chọn một báo cáo để xem chi tiết. Danh sách sẽ mở rộng dần khi công ty cần thêm
                    góc nhìn vận hành mới.
                  </p>
                </div>
              </div>

              <div className="report-catalog-grid">
                <button
                  type="button"
                  className="report-card"
                  onClick={() => setActiveTab('PIPELINE_REPORT')}
                >
                  <span className="report-card__icon">{ICONS.target}</span>
                  <span className="report-card__body">
                    <span className="report-card__title">Đường ống bán hàng theo giai đoạn</span>
                    <span className="report-card__desc">
                      Số cơ hộp, giá trị dự kiến và số ngày trung bình đứng ở mỗi giai đoạn — kèm
                      cảnh báo cơ hộp đọng lâu bất thường.
                    </span>
                  </span>
                  <span className="report-card__arrow">{ICONS.arrowRight}</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'PIPELINE_REPORT' ? (
            <PipelineReportPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onViewOpportunity={(id) => {
                setFocusOpportunityId(id);
                setActiveTab('OPPORTUNITIES');
              }}
            />
          ) : activeTab === 'CUSTOMER_MERGE' ? (
            <CustomerMergePage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'BILL_RATES' ? (
            <BillRatePage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'RATE_HISTORY' ? (
            <RateHistoryPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
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
            <EmployeeDetailPage
              employeeId={selectedEmployeeId}
              onBack={() => setActiveTab('EMPLOYEES')}
              currentUserRoles={currentRoles}
            />
          ) : activeTab === 'EMPLOYEES' ? (
            <EmployeeListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onNavigateDetail={(id) => {
                setSelectedEmployeeId(id);
                setActiveTab('EMPLOYEE_DETAIL');
              }}
            />
            ) : activeTab === 'PROJECT_LABOR_COST' && selectedProjectId ? (
            <ProjectLaborCostPage
              projectId={selectedProjectId}
              currentUserRoles={currentRoles}
              onBack={() => { setSelectedProjectId(null); }}
            />
          ) : activeTab === 'PROJECT_LABOR_COST' ? (
            <div className="user-management-page">
              <div className="page-header">
                <div>
                  <div className="page-header__kicker">
                    <span className="page-header__tag">{ICONS.money} GIÁ VỐN GIỜ CÔNG</span>
                    <span className="page-header__dot" />
                    <span className="page-header__meta">CHƯA CHỌN DỰ ÁN</span>
                  </div>
                  <h1 className="page-title">Giá vốn giờ công dự án</h1>
                  <p className="page-subtitle">
                    Chọn một dự án để xem giá vốn giờ công.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <select
                  className="form-select"
                  style={{ padding: '8px 12px', fontSize: '14px', minWidth: '320px' }}
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) setSelectedProjectId(Number(val));
                  }}
                  data-testid="project-selector-dropdown"
                >
                  <option value="" disabled>
                    -- Chọn dự án --
                  </option>
                  {mockProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.projectCode} — {proj.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeTab === 'OPPORTUNITY_DETAIL' ? (
            selectedOpportunityId ? (
              <OpportunityDetailPage
                opportunityId={selectedOpportunityId}
                opportunityName={selectedOpportunityName}
                currentUserRoles={currentRoles}
                currentUserName={session.fullName}
                backLabel={activityOrigin === 'LIST' ? 'Quay lại Cơ hộp bán hàng' : 'Tìm cơ hộp khác'}
                onBack={() => {
                  // Tab đổi làm OpportunityListPage bị remount hoàn toàn (xem key={activeTab}
                  // ở <main>), nên panel "Đang điều khiển" đang mở sẽ mất theo. Nhờ lại cơ chế
                  // focusOpportunityId (vốn dùng khi nhảy tới từ Báo cáo đường ống) để trang tự
                  // mở lại đúng cơ hộp vừa xem, khỏi bắt người dùng bấm "Chọn" lại từ đầu.
                  if (activityOrigin === 'LIST' && selectedOpportunityId) {
                    setFocusOpportunityId(selectedOpportunityId);
                  }
                  setSelectedOpportunityId(null);
                  setSelectedOpportunityName(undefined);
                  if (activityOrigin === 'LIST') setActiveTab('OPPORTUNITIES');
                  setActivityOrigin(null);
                }}
              />
            ) : (
              <div className="user-management-page">
                <div className="page-header">
                  <div>
                    <div className="page-header__kicker">
                      <span className="page-header__tag">{ICONS.building} CƠ HỘI BÁN HÀNG</span>
                      <span className="page-header__dot" />
                      <span className="page-header__meta">CHĂM SÓC CƠ HỘI</span>
                    </div>
                    <h1 className="page-title">Ghi nhận hoạt động chăm sóc cơ hộp</h1>
                    <p className="page-subtitle">
                      Đây là màn hình xem lại lịch sử chăm sóc và ghi nhận cuộc gọi, email hoặc buổi gặp mới cho
                      một cơ hộp cụ thể — tìm bằng tên cơ hộp hoặc tên khách hàng bên dưới. Cách nhanh hơn: mở{' '}
                      <strong>"Cơ hộp bán hàng"</strong>, chọn một cơ hộp rồi bấm <strong>"Ghi nhận chăm sóc"</strong>.
                    </p>
                  </div>
                </div>

                <div className="user-table-card" style={{ padding: '24px' }}>
                  <OpportunitySearchPicker
                    onSelect={(id, name) => {
                      setSelectedOpportunityId(id);
                      setSelectedOpportunityName(name);
                      setActivityOrigin('PICKER');
                    }}
                  />
                </div>
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
