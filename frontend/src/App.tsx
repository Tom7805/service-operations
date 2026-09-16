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
import ContractListPage from './modules/contracts/pages/ContractListPage';
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
import NotificationCenterPage from './modules/notifications/pages/NotificationCenterPage';
import NotificationList from './modules/notifications/components/NotificationList';
import { getNotifications, getUnreadCount, markNotificationsRead } from './modules/notifications/api/notificationsApi';
import type { NotificationRes } from './modules/notifications/types/notificationTypes';
import { ICONS } from './components/common/icons';
import CommandPalette from './components/common/CommandPalette';
import useScrollReveal from './hooks/useScrollReveal';
import { roleLabels } from './utils/roleLabel';
import { useSessionSync } from './hooks/useSessionSync';
import type { ReactNode } from 'react';

type Tab =
  | 'CUSTOMERS'
  | 'CONTRACTS'
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
  | 'TWO_FACTOR_SETTINGS'
  | 'REPORTS'
  | 'PIPELINE_REPORT'
  | 'MY_WORK'
  | 'TIMESHEET_APPROVAL'
  | 'TIMESHEET_REJECT'
  | 'TIMESHEET_ADJUSTMENT'
  | 'TIMESHEET_PERIOD'
  | 'UNSUBMITTED_TIMESHEETS'
  | 'NOTIFICATIONS';

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
  /**
   * Đặt khi trang KHÔNG chặn hẳn người thiếu `requires` mà chỉ hạ xuống chế độ
   * xem (ví dụ "Cơ hội bán hàng": ai cũng xem được đường ống, chỉ riêng thao
   * tác tạo/chuyển giai đoạn mới cần đúng vai trò). Nếu để trống, mặc định coi
   * là chặn hẳn (bấm vào sẽ gặp màn "Không có thẩm quyền").
   *
   * Icon khóa 🔒 chỉ nên xuất hiện cho mục chặn hẳn — dùng chung cho cả hai
   * loại từng khiến người dùng hiểu lầm "khóa mà vẫn bấm vào xem được, vậy
   * khóa để làm gì" (xem log phản hồi ngày 07/09/2026).
   */
  viewOnlyHint?: string;
}

/** Chấm công — nhóm đầu tiên, không cần nhãn riêng vì đã ở đầu danh sách. */
const TIMESHEET_NAV_ITEMS: NavItem[] = [
  // NCL-05-CN-003/004 + NCL-06-CN-001/002 gộp chung một màn: công việc được giao (mọi
  // vai trò, quyền thật nằm ở backend) cộng bảng giờ công tuần (phần ghi/nộp giờ công
  // chỉ hiện cho VT-03 ngay trong trang, vì TimeEntryController chỉ mở cho vai trò này).
  { tab: 'MY_WORK', icon: ICONS.clock, label: 'Công việc và giờ công' },
  { tab: 'TIMESHEET_APPROVAL', icon: ICONS.checkCircle, label: 'Duyệt bảng chấm công', requires: ['VT-02'] },
  { tab: 'TIMESHEET_REJECT', icon: ICONS.close, label: 'Từ chối bảng chấm công', requires: ['VT-02'] },
  { tab: 'TIMESHEET_ADJUSTMENT', icon: ICONS.edit, label: 'Điều chỉnh giờ công đã duyệt', requires: ['VT-02'] },
  { tab: 'TIMESHEET_PERIOD', icon: ICONS.lock, label: 'Khóa kỳ chấm công', requires: ['VT-05'] },
  { tab: 'UNSUBMITTED_TIMESHEETS', icon: ICONS.clock, label: 'Nhân sự chưa nộp', requires: ['VT-02', 'VT-03'] },
];

/** Kinh doanh — khách hàng, hợp đồng, cơ hội bán hàng, doanh thu, báo cáo. */
const BUSINESS_NAV_ITEMS: NavItem[] = [
  { tab: 'CUSTOMERS', icon: ICONS.building, label: 'Khách hàng', requires: ['VT-04', 'VT-02'] },
  {
    tab: 'CONTRACTS', icon: ICONS.receipt, label: 'Hợp đồng', requires: ['VT-05'],
    // Màn hình lấy hợp đồng làm trung tâm cho Kế toán (VT-05): khai báo loại &
    // hạn mức, mốc thanh toán, kích hoạt, nhắc gia hạn. Các nghiệp vụ này chỉ
    // VT-05 thao tác được nhưng Kế toán KHÔNG vào được hồ sơ khách hàng
    // (chỉ VT-04/VT-02) — đây là lối vào thay thế.
  },
  {
    tab: 'OPPORTUNITIES', icon: ICONS.target, label: 'Cơ hội bán hàng', requires: ['VT-01', 'VT-02', 'VT-04'],
    // OpportunityListPage cho MỌI vai trò xem đường ống bán hàng — chỉ chặn
    // thao tác tạo/chuyển giai đoạn nếu thiếu vai trò Nhân viên kinh doanh
    // (VT-04). Không phải màn hình chặn hẳn như các mục khác.
    viewOnlyHint: 'Cơ hội bán hàng — chế độ chỉ xem, cần vai trò Nhân viên kinh doanh để tạo hoặc chuyển giai đoạn',
  },
  { tab: 'REVENUE_FORECAST', icon: ICONS.chart, label: 'Dự báo doanh thu', requires: ['VT-01', 'VT-04'] },
  { tab: 'REPORTS', icon: ICONS.document, label: 'Báo cáo', matches: ['PIPELINE_REPORT'], requires: ['VT-01', 'VT-04'] },
  { tab: 'CUSTOMER_MERGE', icon: ICONS.merge, label: 'Gộp KH trùng', requires: ['VT-07'] },
  { tab: 'OPPORTUNITY_DETAIL', icon: ICONS.building, label: 'Cơ hội', requires: ['VT-04'] },
];

/** Quản trị & Tổ chức — cơ cấu tổ chức, tài khoản, nhân sự, phân quyền. Tách
 * khỏi nhóm Kinh doanh vì đây là công việc quản trị nội bộ (VT-07/VT-06), không
 * phải nghiệp vụ bán hàng hàng ngày. */
const ADMIN_NAV_ITEMS: NavItem[] = [
  { tab: 'DEPARTMENTS', icon: ICONS.tree, label: 'Tổ chức', requires: ['VT-07'] },
  { tab: 'USERS', icon: ICONS.user, label: 'Tài khoản', matches: ['DETAIL'], requires: ['VT-07'] },
  { tab: 'EMPLOYEES', icon: ICONS.users, label: 'Nhân sự', matches: ['EMPLOYEE_DETAIL'], requires: ['VT-06', 'VT-07'] },
  { tab: 'PERMISSIONS', icon: ICONS.shield, label: 'Phân quyền', requires: ['VT-07'] },
];

/** Bảo mật & Hệ thống — nhóm riêng, tách khỏi điều hướng nghiệp vụ hàng ngày (theo mẫu "Favorites"
 * của tham chiếu: một nhãn xám nhỏ đứng trên nhóm mục phụ). */
const SYSTEM_NAV_ITEMS: NavItem[] = [
  { tab: 'TWO_FACTOR_SETTINGS', icon: ICONS.key, label: '2FA', requires: ['VT-07'] },
  { tab: 'SYSTEM_AUDIT_LOG', icon: ICONS.history, label: 'Nhật ký hệ thống', requires: ['VT-07'] },
  { tab: 'AUDIT_LOG', icon: ICONS.shieldOff, label: 'Dữ liệu nhạy cảm', requires: ['VT-07'] },
];

const ALL_NAV_ITEMS: NavItem[] = [
  ...TIMESHEET_NAV_ITEMS,
  ...BUSINESS_NAV_ITEMS,
  ...ADMIN_NAV_ITEMS,
  ...SYSTEM_NAV_ITEMS,
];


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
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null);
  const [selectedOpportunityName, setSelectedOpportunityName] = useState<string | undefined>(undefined);
  /** Nhớ người dùng vào màn "Ghi nhận chăm sóc" từ đâu để nút quay lại trả về
   *  đúng chỗ: từ danh sách "Cơ hội bán hàng" thì về lại danh sách, còn tự tìm
   *  trực tiếp trong tab "Cơ hội" thì quay về ô tìm kiếm. */
  const [activityOrigin, setActivityOrigin] = useState<'LIST' | 'PICKER' | null>(null);
  /** Từ báo cáo đường ống, bấm vào một cơ hội đọng lâu thì nhảy sang "Cơ hội
   *  bán hàng" và tự mở đúng cơ hội đó lên để xử lý ngay (chuyển giai đoạn/
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
      const underprivileged = !canAccess(item);
      // Chỉ mục CHẶN HẲN mới coi là "locked" (mờ đi + icon khóa). Mục chỉ hạ
      // xuống chế độ xem (viewOnlyHint) vẫn mở được bình thường, không mờ,
      // không có icon khóa — tránh hiểu lầm "khóa mà vẫn bấm vào xem được".
      const isViewOnlyForUser = underprivileged && Boolean(item.viewOnlyHint);
      const locked = underprivileged && !item.viewOnlyHint;
      const title = locked
        ? `${item.label} — cần vai trò khác`
        : isViewOnlyForUser
        ? item.viewOnlyHint
        : (sidebarCollapsed ? item.label : undefined);
      return (
        <button
          key={item.tab}
          type="button"
          className={`side-nav__item ${isActive ? 'side-nav__item--active' : ''} ${locked ? 'side-nav__item--locked' : ''}`}
          onClick={() => setActiveTab(item.tab)}
          aria-current={isActive ? 'page' : undefined}
          title={title}
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
          ...TIMESHEET_NAV_ITEMS.map((i) => ({ id: i.tab, label: i.label, group: 'Chấm công', icon: i.icon })),
          ...BUSINESS_NAV_ITEMS.map((i) => ({ id: i.tab, label: i.label, group: 'Kinh doanh', icon: i.icon })),
          ...ADMIN_NAV_ITEMS.map((i) => ({ id: i.tab, label: i.label, group: 'Quản trị & Tổ chức', icon: i.icon })),
          ...SYSTEM_NAV_ITEMS.map((i) => ({ id: i.tab, label: i.label, group: 'Bảo mật & hệ thống', icon: i.icon })),
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

          <nav className="side-nav__list" aria-label="Điều hướng chính">
            {renderNavGroup(TIMESHEET_NAV_ITEMS)}

            <div className="side-nav__group-label">{!sidebarCollapsed ? 'Kinh doanh' : ''}</div>
            {renderNavGroup(BUSINESS_NAV_ITEMS)}

            <div className="side-nav__group-label">{!sidebarCollapsed ? 'Quản trị & Tổ chức' : ''}</div>
            {renderNavGroup(ADMIN_NAV_ITEMS)}

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
            <ChangePasswordPage onBack={() => setActiveTab('DEPARTMENTS')} onPasswordChanged={handleLogout} />
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
                      Số cơ hội, giá trị dự kiến và số ngày trung bình đứng ở mỗi giai đoạn — kèm
                      cảnh báo cơ hội đọng lâu bất thường.
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
                opportunityName={selectedOpportunityName}
                currentUserRoles={currentRoles}
                currentUserName={session.fullName}
                backLabel={activityOrigin === 'LIST' ? 'Quay lại Cơ hội bán hàng' : 'Tìm cơ hội khác'}
                onBack={() => {
                  // Tab đổi làm OpportunityListPage bị remount hoàn toàn (xem key={activeTab}
                  // ở <main>), nên panel "Đang điều khiển" đang mở sẽ mất theo. Nhờ lại cơ chế
                  // focusOpportunityId (vốn dùng khi nhảy tới từ Báo cáo đường ống) để trang tự
                  // mở lại đúng cơ hội vừa xem, khỏi bắt người dùng bấm "Chọn" lại từ đầu.
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
                    <h1 className="page-title">Ghi nhận hoạt động chăm sóc cơ hội</h1>
                    <p className="page-subtitle">
                      Đây là màn hình xem lại lịch sử chăm sóc và ghi nhận cuộc gọi, email hoặc buổi gặp mới cho
                      một cơ hội cụ thể — tìm bằng tên cơ hội hoặc tên khách hàng bên dưới. Cách nhanh hơn: mở{' '}
                      <strong>"Cơ hội bán hàng"</strong>, chọn một cơ hội rồi bấm <strong>"Ghi nhận chăm sóc"</strong>.
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
