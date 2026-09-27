import { Fragment, Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import LoginPage from './modules/auth/pages/LoginPage';
import type { AuthSession } from './modules/auth/types/authTypes';
import { isPortalHash, portalFeatureOf } from './modules/portal/utils/portalRoute';
import { NOTIFICATIONS_CHANGED_EVENT } from './modules/notifications/utils/notificationEvents';
import NotificationList from './modules/notifications/components/NotificationList';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationsRead,
  NotificationsApiError,
  openNotification,
} from './modules/notifications/api/notificationsApi';
import type { NotificationRes } from './modules/notifications/types/notificationTypes';
import { resolveNotificationDestination } from './modules/notifications/utils/notificationTarget';
import { getAllProjects, getWorkBreakdown } from './modules/projects/api/projectsApi';
import type { ProjectRes } from './modules/projects/types/projectTypes';
import type { WorkBreakdownRes } from './modules/projects/types/taskTypes';
import ProjectWbsModal from './modules/projects/components/ProjectWbsModal';
import { ICONS } from './components/common/icons';
import CommandPalette from './components/common/CommandPalette';
import useScrollReveal from './hooks/useScrollReveal';
import { roleLabels } from './utils/roleLabel';
import { useSessionSync } from './hooks/useSessionSync';
import { LAST_ACTIVITY_KEY, SESSION_IDLE_MINUTES, markActivity, useIdleLogout } from './hooks/useIdleLogout';
import HubFrame from './layouts/components/HubFrame';
import Breadcrumb, { type Crumb } from './layouts/components/Breadcrumb';
import {
  Tab,
  NavItem,
  REPORT_CHILD_LABELS,
  accountLeavesFor,
  navGroupsFor,
  defaultTabFor,
  entryTabOf,
  findLeaf,
  findNavItem,
  groupOf,
  isTabVisible,
  visibleTabsOf,
} from './layouts/menuConfig';

/**
 * Moi man hinh la mot khoi ma rieng, tai khi can (React.lazy): trang dang nhap chi phai tai ma cua chinh
 * no thay vi ca ~60 man hinh. Ngay sau khi dang nhap, 59 khoi nay duoc tai san luc trinh duyet ranh
 * (preloadPages) nen chuyen menu van tuc thi, khong phai cho tai ma.
 */
const PAGE_LOADERS = {
  UserListPage: () => import('./modules/users/pages/UserListPage'),
  UserDetailPage: () => import('./modules/users/pages/UserDetailPage'),
  RolePermissionPage: () => import('./modules/users/pages/RolePermissionPage'),
  PortalAccountPage: () => import('./modules/portal/pages/PortalAccountPage'),
  PortalAccessDeniedPage: () => import('./modules/portal/pages/PortalAccessDeniedPage'),
  DepartmentTreePage: () => import('./modules/departments/pages/DepartmentTreePage'),
  SensitiveAccessLogPage: () => import('./modules/auditLog/pages/SensitiveAccessLogPage'),
  AuditLogPage: () => import('./modules/auditLog/pages/AuditLogPage'),
  EmployeeListPage: () => import('./modules/employees/pages/EmployeeListPage'),
  EmployeeDetailPage: () => import('./modules/employees/pages/EmployeeDetailPage'),
  ChangePasswordPage: () => import('./modules/auth/pages/ChangePasswordPage'),
  TwoFactorSetupPage: () => import('./modules/auth/pages/TwoFactorSetupPage'),
  CustomerListPage: () => import('./modules/customers/pages/CustomerListPage'),
  CustomerMergePage: () => import('./modules/customers/pages/CustomerMergePage'),
  ContractListPage: () => import('./modules/contracts/pages/ContractListPage'),
  ContractDetailPage: () => import('./modules/contracts/pages/ContractDetailPage'),
  InvoicesPage: () => import('./modules/invoices/pages/InvoicesPage'),
  InvoiceDetailPage: () => import('./modules/invoices/pages/InvoiceDetailPage'),
  AcceptanceListPage: () => import('./modules/acceptance/pages/AcceptanceListPage'),
  AcceptanceDetailPage: () => import('./modules/acceptance/pages/AcceptanceDetailPage'),
  DeliverablePage: () => import('./modules/acceptance/pages/DeliverablePage'),
  BillRatePage: () => import('./modules/rates/pages/BillRatePage'),
  RateHistoryPage: () => import('./modules/rates/pages/RateHistoryPage'),
  OpportunityDetailPage: () => import('./modules/opportunities/pages/OpportunityDetailPage'),
  OpportunityListPage: () => import('./modules/opportunities/pages/OpportunityListPage'),
  RevenueForecastPage: () => import('./modules/opportunities/pages/RevenueForecastPage'),
  PipelineReportPage: () => import('./modules/reports/pages/PipelineReportPage'),
  DashboardPage: () => import('./modules/reports/pages/DashboardPage'),
  UtilizationReportPage: () => import('./modules/reports/pages/UtilizationReportPage'),
  ProjectPerformanceReportPage: () => import('./modules/reports/pages/ProjectPerformanceReportPage'),
  ReportExportPage: () => import('./modules/reports/pages/ReportExportPage'),
  RevenueReportPage: () => import('./modules/reports/pages/RevenueReportPage'),
  TimesheetReportPage: () => import('./modules/reports/pages/TimesheetReportPage'),
  ReportCatalogPage: () => import('./modules/reports/pages/ReportCatalogPage'),
  MyWorkPage: () => import('./modules/mytasks/pages/MyWorkPage'),
  ProjectListPage: () => import('./modules/projects/pages/ProjectListPage'),
  ProjectDetailPage: () => import('./modules/projects/pages/ProjectDetailPage'),
  ProjectRiskPage: () => import('./modules/projects/pages/ProjectRiskPage'),
  TimesheetApprovalPage: () => import('./modules/timesheets/pages/TimesheetApprovalPage'),
  TimesheetAdjustmentPage: () => import('./modules/timesheets/pages/TimesheetAdjustmentPage'),
  TimesheetPeriodPage: () => import('./modules/timesheets/pages/TimesheetPeriodPage'),
  UnsubmittedTimesheetsPage: () => import('./modules/timesheets/pages/UnsubmittedTimesheetsPage'),
  ExpenseApprovalPage: () => import('./modules/expenses/pages/ExpenseApprovalPage'),
  OverheadAllocationPage: () => import('./modules/expenses/pages/OverheadAllocationPage'),
  MarginByCustomerPage: () => import('./modules/profitability/pages/MarginByCustomerPage'),
  MarginByEmployeePage: () => import('./modules/profitability/pages/MarginByEmployeePage'),
  ProjectLaborCostPage: () => import('./modules/profitability/pages/ProjectLaborCostPage'),
  PlannedVsActualPage: () => import('./modules/profitability/pages/PlannedVsActualPage'),
  ProfitForecastPage: () => import('./modules/profitability/pages/ProfitForecastPage'),
  ProjectRecognizedRevenuePage: () => import('./modules/profitability/pages/ProjectRecognizedRevenuePage'),
  ProjectMarginPage: () => import('./modules/profitability/pages/ProjectMarginPage'),
  MarginAlertThresholdPage: () => import('./modules/profitability/pages/MarginAlertThresholdPage'),
  NotificationCenterPage: () => import('./modules/notifications/pages/NotificationCenterPage'),
  NotificationPreferencePage: () => import('./modules/notifications/pages/NotificationPreferencePage'),
  NotificationDedupConfigPage: () => import('./modules/notifications/pages/NotificationDedupConfigPage'),
  ServiceCatalogPage: () => import('./modules/admin/pages/ServiceCatalogPage'),
  CompanySettingPage: () => import('./modules/admin/pages/CompanySettingPage'),
  FiscalPeriodPage: () => import('./modules/admin/pages/FiscalPeriodPage'),
  BackupRestorePage: () => import('./modules/admin/pages/BackupRestorePage'),
  DataImportPage: () => import('./modules/admin/pages/DataImportPage'),
  MaskingRulePage: () => import('./modules/auditLog/pages/MaskingRulePage'),
  PortalApp: () => import('./modules/portal/PortalApp'),
};

function whenIdle(run: () => void) {
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  if (idle) idle(run);
  else window.setTimeout(run, 300);
}

/** Tai san moi man hinh luc trinh duyet ranh — goi mot lan sau khi dang nhap. */
function preloadPages() {
  whenIdle(() => Object.values(PAGE_LOADERS).forEach((load) => void load().catch(() => undefined)));
}

/**
 * Trong luc nguoi dung go mat khau, tai san hai man hinh dich sau dang nhap (defaultTabFor: "To chuc"
 * hoac "Viec cua toi") — bam Dang nhap xong la noi dung hien ngay, khong phai doi tai ma trang dau.
 */
function preloadLanding() {
  whenIdle(() => [PAGE_LOADERS.MyWorkPage, PAGE_LOADERS.DepartmentTreePage].forEach((load) => void load().catch(() => undefined)));
}

const UserListPage = lazy(PAGE_LOADERS.UserListPage);
const UserDetailPage = lazy(PAGE_LOADERS.UserDetailPage);
const RolePermissionPage = lazy(PAGE_LOADERS.RolePermissionPage);
const PortalAccountPage = lazy(PAGE_LOADERS.PortalAccountPage);
const PortalAccessDeniedPage = lazy(PAGE_LOADERS.PortalAccessDeniedPage);
const DepartmentTreePage = lazy(PAGE_LOADERS.DepartmentTreePage);
const SensitiveAccessLogPage = lazy(PAGE_LOADERS.SensitiveAccessLogPage);
const AuditLogPage = lazy(PAGE_LOADERS.AuditLogPage);
const EmployeeListPage = lazy(PAGE_LOADERS.EmployeeListPage);
const EmployeeDetailPage = lazy(PAGE_LOADERS.EmployeeDetailPage);
const ChangePasswordPage = lazy(PAGE_LOADERS.ChangePasswordPage);
const TwoFactorSetupPage = lazy(PAGE_LOADERS.TwoFactorSetupPage);
const CustomerListPage = lazy(PAGE_LOADERS.CustomerListPage);
const CustomerMergePage = lazy(PAGE_LOADERS.CustomerMergePage);
const ContractListPage = lazy(PAGE_LOADERS.ContractListPage);
const ContractDetailPage = lazy(PAGE_LOADERS.ContractDetailPage);
const InvoicesPage = lazy(PAGE_LOADERS.InvoicesPage);
const InvoiceDetailPage = lazy(PAGE_LOADERS.InvoiceDetailPage);
const AcceptanceListPage = lazy(PAGE_LOADERS.AcceptanceListPage);
const AcceptanceDetailPage = lazy(PAGE_LOADERS.AcceptanceDetailPage);
const DeliverablePage = lazy(PAGE_LOADERS.DeliverablePage);
const BillRatePage = lazy(PAGE_LOADERS.BillRatePage);
const RateHistoryPage = lazy(PAGE_LOADERS.RateHistoryPage);
const OpportunityDetailPage = lazy(PAGE_LOADERS.OpportunityDetailPage);
const OpportunityListPage = lazy(PAGE_LOADERS.OpportunityListPage);
const RevenueForecastPage = lazy(PAGE_LOADERS.RevenueForecastPage);
const PipelineReportPage = lazy(PAGE_LOADERS.PipelineReportPage);
const DashboardPage = lazy(PAGE_LOADERS.DashboardPage);
const UtilizationReportPage = lazy(PAGE_LOADERS.UtilizationReportPage);
const ProjectPerformanceReportPage = lazy(PAGE_LOADERS.ProjectPerformanceReportPage);
const ReportExportPage = lazy(PAGE_LOADERS.ReportExportPage);
const RevenueReportPage = lazy(PAGE_LOADERS.RevenueReportPage);
const TimesheetReportPage = lazy(PAGE_LOADERS.TimesheetReportPage);
const ReportCatalogPage = lazy(PAGE_LOADERS.ReportCatalogPage);
const MyWorkPage = lazy(PAGE_LOADERS.MyWorkPage);
const ProjectListPage = lazy(PAGE_LOADERS.ProjectListPage);
const ProjectDetailPage = lazy(PAGE_LOADERS.ProjectDetailPage);
const ProjectRiskPage = lazy(PAGE_LOADERS.ProjectRiskPage);
const TimesheetApprovalPage = lazy(PAGE_LOADERS.TimesheetApprovalPage);
const TimesheetAdjustmentPage = lazy(PAGE_LOADERS.TimesheetAdjustmentPage);
const TimesheetPeriodPage = lazy(PAGE_LOADERS.TimesheetPeriodPage);
const UnsubmittedTimesheetsPage = lazy(PAGE_LOADERS.UnsubmittedTimesheetsPage);
const ExpenseApprovalPage = lazy(PAGE_LOADERS.ExpenseApprovalPage);
const OverheadAllocationPage = lazy(PAGE_LOADERS.OverheadAllocationPage);
const MarginByCustomerPage = lazy(PAGE_LOADERS.MarginByCustomerPage);
const MarginByEmployeePage = lazy(PAGE_LOADERS.MarginByEmployeePage);
const ProjectLaborCostPage = lazy(PAGE_LOADERS.ProjectLaborCostPage);
const PlannedVsActualPage = lazy(PAGE_LOADERS.PlannedVsActualPage);
const ProfitForecastPage = lazy(PAGE_LOADERS.ProfitForecastPage);
const ProjectRecognizedRevenuePage = lazy(PAGE_LOADERS.ProjectRecognizedRevenuePage);
const ProjectMarginPage = lazy(PAGE_LOADERS.ProjectMarginPage);
const MarginAlertThresholdPage = lazy(PAGE_LOADERS.MarginAlertThresholdPage);
const NotificationCenterPage = lazy(PAGE_LOADERS.NotificationCenterPage);
const NotificationPreferencePage = lazy(PAGE_LOADERS.NotificationPreferencePage);
const NotificationDedupConfigPage = lazy(PAGE_LOADERS.NotificationDedupConfigPage);
const ServiceCatalogPage = lazy(PAGE_LOADERS.ServiceCatalogPage);
const CompanySettingPage = lazy(PAGE_LOADERS.CompanySettingPage);
const FiscalPeriodPage = lazy(PAGE_LOADERS.FiscalPeriodPage);
const BackupRestorePage = lazy(PAGE_LOADERS.BackupRestorePage);
const DataImportPage = lazy(PAGE_LOADERS.DataImportPage);
const MaskingRulePage = lazy(PAGE_LOADERS.MaskingRulePage);
const PortalApp = lazy(PAGE_LOADERS.PortalApp);

/** Vai trò được backend cho liệt kê dự án (GET /projects). */
const PROJECT_LIST_ROLES = ['VT-01', 'VT-02', 'VT-03', 'VT-05'];

/** Các màn hình của "Lợi nhuận dự án" cùng xem MỘT dự án — chọn một lần ở đầu khu làm việc. */
const PROJECT_SCOPED_TABS: Tab[] = [
  'PROJECT_MARGIN',
  'PROJECT_LABOR_COST',
  'PROJECT_RECOGNIZED_REVENUE',
  'PLANNED_VS_ACTUAL',
  'PROFIT_FORECAST',
];

/** Tên màn hình con (chi tiết một bản ghi) trên đường dẫn của thanh tiêu đề. */
const CHILD_LABELS: Partial<Record<Tab, string>> = {
  ...REPORT_CHILD_LABELS,
  CONTRACT_DETAIL: 'Chi tiết hợp đồng',
  INVOICE_DETAIL: 'Chi tiết hóa đơn',
  ACCEPTANCE_DETAIL: 'Chi tiết phiếu',
  EMPLOYEE_DETAIL: 'Hồ sơ nhân sự',
  DETAIL: 'Chi tiết tài khoản',
  OPPORTUNITY_DETAIL: 'Hoạt động chăm sóc',
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

function wbsContainsTask(items: WorkBreakdownRes[], taskId: number): boolean {
  return items.some(
    (wp) => (wp.tasks ?? []).some((t) => t.id === taskId) || wbsContainsTask(wp.children ?? [], taskId)
  );
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
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  // MỘT "dự án đang chọn" dùng chung cho Dự án, Nghiệm thu và Lợi nhuận: chọn ở đâu thì các màn kia
  // mở sẵn đúng dự án đó, không phải chọn lại (trước đây Nghiệm thu và Lợi nhuận giữ hai lựa chọn riêng).
  const acceptanceProjectId = selectedProjectId;
  const setAcceptanceProjectId = setSelectedProjectId;
  const [selectedAcceptanceId, setSelectedAcceptanceId] = useState<number | null>(null);

  // Danh sách dự án dùng cho các ô chọn dạng dropdown ở màn hình Giá vốn/Biên lợi nhuận
  // (NCL-09) — nạp một lần từ GET /projects khi đăng nhập.
  const [allProjects, setAllProjects] = useState<ProjectRes[]>([]);
  const [selectedOpportunityName, setSelectedOpportunityName] = useState<string | undefined>(undefined);
  /** Nhớ người dùng vào màn "Ghi nhận chăm sóc" từ đâu để nút quay lại trả về
   *  đúng chỗ: từ danh sách "Cơ hội bán hàng" thì về lại danh sách, còn tự tìm
   *  trực tiếp trong tab "Cơ hội" thì quay về ô tìm kiếm. */
  const [activityOrigin, setActivityOrigin] = useState<'LIST' | 'PICKER' | null>(null);
  /** Từ báo cáo đường ống, bấm vào một cơ hội đọng lâu thì nhảy sang "Cơ hội
   *  bán hàng" và tự mở đúng cơ hội đó lên để xử lý ngay (chuyển giai đoạn/
   *  chốt kết quả), thay vì chỉ biết mỗi con số ID không thao tác được gì. */
  const [focusOpportunityId, setFocusOpportunityId] = useState<number | null>(null);
  /** Đường dẫn `#/portal/...` của cổng khách hàng — tài khoản nội bộ mở vào sẽ bị từ chối (NCL-13-CN-002-TC-04). */
  const readPortalHash = () => (isPortalHash(window.location.hash) ? window.location.hash : '');
  const [portalHashValue, setPortalHashValue] = useState<string>(readPortalHash);
  const portalHashRequested = portalHashValue !== '';
  useEffect(() => {
    const onHash = () => setPortalHashValue(readPortalHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const leavePortalHash = () => {
    if (!isPortalHash(window.location.hash)) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setPortalHashValue('');
  };
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<NotificationRes[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpeningId, setNotifOpeningId] = useState<number | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  // NCL-14-CN-001 TC-02: công việc/dự án được mở từ một thông báo — hiển thị cấu trúc công việc
  // của dự án ngay trên màn hình hiện tại, tô sáng đúng công việc liên quan.
  const [wbsFocus, setWbsFocus] = useState<{ project: ProjectRes | null; projectId: number; taskId: number | null } | null>(
    null
  );
  const [appToast, setAppToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const appToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showAppToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    if (appToastTimer.current) clearTimeout(appToastTimer.current);
    setAppToast({ message, type });
    appToastTimer.current = setTimeout(() => setAppToast(null), 5000);
  }
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

  // Chan hanh vi KEO van ban da boi den (mac dinh cua trinh duyet, khong can JS
  // nao khoi tao) — ung dung khong dung drag-and-drop o dau ca nen chan an
  // toan tuyet doi. Ly do them: nguoi dung boi den chu roi bam ra cho trong
  // nhieu lan lam trang treo cung, khong bam duoc gi nua (ke ca F12), chi
  // reload moi het — dung dau hieu cua mot phien keo-tha cap he dieu hanh
  // (OLE drag) bi ket do tha khong dung vi tri hop le, thay vi mot loi
  // JavaScript (ung dung khong co code nao lang nghe drag/selection ca).
  useEffect(() => {
    const preventTextDrag = (e: DragEvent) => e.preventDefault();
    document.addEventListener('dragstart', preventTextDrag);
    return () => document.removeEventListener('dragstart', preventTextDrag);
  }, []);

  // Lý do phiên vừa kết thúc ngoài ý người dùng (hết hạn / không thao tác) — hiện trên màn đăng nhập.
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  function persistSession(next: AuthSession) {
    localStorage.setItem('token', next.accessToken);
    localStorage.setItem('session', JSON.stringify(next));
    setSession(next);
  }

  function handleAuthenticated(newSession: AuthSession) {
    markActivity();
    setLoginNotice(null);
    persistSession(newSession);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('session');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setSession(null);
  }

  function handleSessionExpired(reason: string) {
    handleLogout();
    setLoginNotice(reason);
  }

  // NCL-01-CN-004 TC-03: admin đổi vai trò ở tab/máy khác → phiên này áp dụng ngay
  // (làm mới khi focus lại + poll 30s), không bắt đăng nhập lại; 401 thì đăng xuất.
  useSessionSync({
    session,
    onRefresh: persistSession,
    onExpired: () => handleSessionExpired('Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.'),
  });

  // NCL-01-CN-001 TC-03: để quá lâu không thao tác thì bắt đăng nhập lại.
  useIdleLogout({
    enabled: session !== null,
    onIdle: () =>
      handleSessionExpired(
        `Phiên làm việc đã kết thúc do không thao tác trong ${SESSION_IDLE_MINUTES} phút. Vui lòng đăng nhập lại.`,
      ),
  });

  // Nạp danh sách dự án cho các ô chọn dropdown (Giá vốn/Biên lợi nhuận) ngay khi đăng nhập —
  // trước đây các trang này dùng tạm mảng dữ liệu mẫu cố định nên không bao giờ thấy dự án thật.
  useEffect(() => {
    // Chỉ vai trò được GET /projects mới nạp (VT-01/02/03/05) — vai trò khác (kinh doanh, nhân sự,
    // quản trị, cổng khách hàng) gọi sẽ bị 403 và làm nhiễu nhật ký từ chối truy cập.
    if (!session || !session.roles.some((r) => PROJECT_LIST_ROLES.includes(r))) return;
    let cancelled = false;
    void (async () => {
      try {
        const projects = await getAllProjects();
        if (!cancelled) setAllProjects(projects);
      } catch {
        // Bỏ qua lỗi nạp danh sách dự án — các trang liên quan vẫn hoạt động, chỉ thiếu dropdown.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // NCL-06-CN-009: chấm đỏ trên chuông thông báo phản ánh đúng số chưa đọc thật (gồm cả
  // TIMESHEET_REMINDER) — nạp ngay khi đăng nhập rồi làm mới định kỳ mỗi 30 giây.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const count = await getUnreadCount();
        // Chi set lai khi so thuc su doi — tranh re-render toan bo App (gom ca
        // trang dang xem) moi 30s khi so chua doc khong doi, ly do khien vung
        // van ban nguoi dung dang boi den bi DOM dung cham vo co dinh ky.
        if (!cancelled) setUnreadCount((prev) => (prev === count ? prev : count));
      } catch {
        // Bỏ qua lỗi đếm chưa đọc — không làm gián đoạn trải nghiệm chính.
      }
    };
    void fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    // NCL-14-CN-003: thao tác sinh thông báo tức thì (vd duyệt bảng chấm công) báo qua sự kiện này.
    const onChanged = () => void fetchUnread();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
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

  async function refreshUnreadCount() {
    try {
      setUnreadCount(await getUnreadCount());
    } catch {
      // Bỏ qua — lần poll 30s kế tiếp sẽ tự đồng bộ lại.
    }
  }

  /** Tìm dự án chứa công việc — thông báo chỉ mang id công việc (TASK_BUDGET_EXCEEDED, TIMER_AUTO_STOPPED). */
  async function findProjectOfTask(taskId: number): Promise<ProjectRes | null> {
    const projects = allProjects.length > 0 ? allProjects : await getAllProjects().catch(() => [] as ProjectRes[]);
    const results = await Promise.allSettled(
      projects.map(async (p) => (wbsContainsTask(await getWorkBreakdown(p.id), taskId) ? p : null))
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) return r.value;
    }
    return null;
  }

  /**
   * NCL-14-CN-001 TC-02: sau khi mở một thông báo, chuyển thẳng tới bản ghi liên quan. Màn hình
   * đích vẫn tự kiểm tra quyền qua API của chính nó; ở đây chỉ chặn sớm màn hình người dùng không thấy.
   */
  async function navigateToNotification(opened: NotificationRes) {
    const dest = resolveNotificationDestination(opened);
    const roles = session?.roles ?? [];
    if (dest.kind === 'NONE') {
      showAppToast('Đã đánh dấu đã đọc. Thông báo này không gắn với bản ghi cụ thể nào.', 'info');
      return;
    }
    if (dest.kind === 'TAB') {
      if (!isTabVisible(dest.tab, roles)) {
        showAppToast(`Bạn không có quyền mở màn hình "${dest.label}" liên quan tới thông báo này.`, 'error');
        return;
      }
      if (dest.recordId != null) {
        if (dest.tab === 'INVOICE_DETAIL') setSelectedInvoiceId(dest.recordId);
        if (dest.tab === 'ACCEPTANCE_DETAIL') setSelectedAcceptanceId(dest.recordId);
        if (dest.tab === 'CONTRACT_DETAIL') setSelectedContractId(dest.recordId);
        if (dest.tab === 'PROJECT_MARGIN') setSelectedProjectId(dest.recordId);
      }
      leavePortalHash();
      setActiveTab(dest.tab);
      return;
    }
    if (dest.kind === 'PROJECT_WBS') {
      const project = allProjects.find((p) => p.id === dest.projectId) ?? null;
      setWbsFocus({ project, projectId: dest.projectId, taskId: null });
      return;
    }
    showAppToast('Đang tìm công việc liên quan…', 'info');
    const project = await findProjectOfTask(dest.taskId);
    if (!project) {
      showAppToast(
        `Không tìm thấy công việc #${dest.taskId} — có thể công việc đã bị xóa hoặc bạn không còn quyền xem dự án chứa nó.`,
        'error'
      );
      return;
    }
    setAppToast(null);
    setWbsFocus({ project, projectId: project.id, taskId: dest.taskId });
  }

  /** Bấm một thông báo trong ô chuông: mở (đánh dấu đã đọc + ghi nhật ký) rồi điều hướng. */
  async function handleOpenNotificationFromBell(notification: NotificationRes) {
    if (notifOpeningId != null) return;
    setNotifOpeningId(notification.id);
    try {
      const opened = await openNotification(notification.id);
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
      void refreshUnreadCount();
      setNotifOpen(false);
      void navigateToNotification(opened);
    } catch (err) {
      showAppToast(
        err instanceof NotificationsApiError && err.statusCode === 404
          ? 'Thông báo không còn tồn tại hoặc không thuộc về bạn.'
          : err instanceof Error
            ? err.message
            : 'Không thể mở thông báo.',
        'error'
      );
    } finally {
      setNotifOpeningId(null);
    }
  }

  async function handleMarkAllFromBell() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => (notifTab === 'UNREAD' ? [] : prev.map((n) => ({ ...n, isRead: true }))));
      setUnreadCount(0);
    } catch (err) {
      showAppToast(err instanceof Error ? err.message : 'Không thể đánh dấu tất cả đã đọc.', 'error');
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
  const sessionRoles = session?.roles;
  const currentRoles = useMemo(() => sessionRoles ?? [], [sessionRoles]);
  const isPortalUser = currentRoles.includes('VT-09');

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
  // Màn hình tài khoản có phân quyền (vd "Quyền xem dữ liệu") — mở từ menu tài khoản và bảng lệnh.
  const accountLeaves = useMemo(() => accountLeavesFor(currentRoles), [currentRoles]);
  // Chi tiết dự án + WBS: backend chỉ mở cho Ban giám đốc, Quản lý dự án, Nhân viên (NCL-05-CN-002).
  const canOpenProjectDetail = currentRoles.some((r) => r === 'VT-01' || r === 'VT-02' || r === 'VT-03');

  // Vua dang nhap xong: tai san ma moi man hinh luc trinh duyet ranh, de lan dau bam menu nao cung tuc thi.
  // Con o trang dang nhap: chi tai san man hinh dich dau tien.
  const signedIn = Boolean(session);
  useEffect(() => {
    if (signedIn) preloadPages();
    else preloadLanding();
  }, [signedIn]);

  if (!session) return <LoginPage onAuthenticated={handleAuthenticated} notice={loginNotice} />;

  // Epic NCL-13: tài khoản Khách hàng (VT-09) dùng giao diện cổng riêng — không vào giao diện nội bộ (QTN-26).
  if (isPortalUser) {
    return (
      <Suspense fallback={null}>
        <PortalApp session={session} onLogout={handleLogout} />
      </Suspense>
    );
  }

  const activeNavItem = findNavItem(activeTab);
  const activeLeaf = findLeaf(activeTab);
  const hubTabs = activeNavItem?.tabs ? visibleTabsOf(activeNavItem, currentRoles) : [];
  // Chỉ bọc khu làm việc khi đang ở chính một tab của nó (không phải màn hình chi tiết) và có từ hai tab.
  const inHub = hubTabs.length > 1 && hubTabs.some((leaf) => leaf.tab === activeTab);

  function goTo(tab: Tab) {
    leavePortalHash();
    setActiveTab(tab);
  }

  const renderNavGroup = (items: NavItem[]) =>
    items.map((item) => {
      const isActive = activeNavItem?.id === item.id;
      return (
        <button
          key={item.id}
          type="button"
          className={`side-nav__item ${isActive ? 'side-nav__item--active' : ''}`}
          title={sidebarCollapsed ? item.label : undefined}
          onClick={() => goTo(entryTabOf(item, currentRoles))}
          aria-current={isActive ? 'page' : undefined}
          data-testid={`nav-${item.id}`}
        >
          <span className="side-nav__item__icon" aria-hidden="true">
            {item.icon}
          </span>
          {!sidebarCollapsed && <span className="side-nav__item__label">{item.label}</span>}
        </button>
      );
    });

  /** Đường dẫn trên thanh tiêu đề: nhóm › mục › màn hình con. Mắt xích cha bấm được để quay về. */
  function breadcrumbFor(): Crumb[] {
    if (portalHashRequested) return [{ label: 'Cổng khách hàng' }];
    if (activeTab === 'NOTIFICATIONS') return [{ label: 'Thông báo' }];
    if (activeTab === 'NOTIFICATION_PREFERENCES') {
      return [{ label: 'Thông báo', onClick: () => goTo('NOTIFICATIONS') }, { label: 'Cài đặt nhận thông báo' }];
    }
    if (activeTab === 'CHANGE_PASSWORD') return [{ label: 'Tài khoản của tôi' }, { label: 'Đổi mật khẩu' }];
    if (activeTab === 'PROJECT_DETAIL' || activeTab === 'PROJECT_RISKS') {
      const projectName = allProjects.find((p) => p.id === selectedProjectId)?.name ?? 'Chi tiết dự án';
      const crumbs: Crumb[] = [{ label: 'Dự án', onClick: () => goTo('PROJECTS') }];
      if (activeTab === 'PROJECT_RISKS') {
        crumbs.push({ label: projectName, onClick: () => goTo('PROJECT_DETAIL') }, { label: 'Rủi ro' });
      } else {
        crumbs.push({ label: projectName });
      }
      return crumbs;
    }
    const accountLeaf = accountLeaves.find((leaf) => leaf.tab === activeTab);
    if (accountLeaf) return [{ label: 'Tài khoản của tôi' }, { label: accountLeaf.label }];
    if (!activeNavItem) return [{ label: 'Vận hành dịch vụ' }];
    const crumbs: Crumb[] = [];
    const group = groupOf(activeNavItem);
    if (group?.label) crumbs.push({ label: group.label });
    const childLabel = activeLeaf && activeLeaf.tab !== activeTab ? CHILD_LABELS[activeTab] : undefined;
    crumbs.push({
      label: activeNavItem.label,
      onClick: childLabel && activeLeaf ? () => goTo(activeLeaf.tab) : undefined,
    });
    if (childLabel) crumbs.push({ label: childLabel });
    return crumbs;
  }

  /** Ô chọn dự án dùng chung cho các tab của "Lợi nhuận dự án" — đổi tab vẫn giữ dự án đang xem. */
  const projectPicker = (
    <label className="hub-picker">
      <span className="hub-picker__label">Dự án</span>
      <select
        className="form-select"
        value={selectedProjectId ?? ''}
        onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
        data-testid="project-selector-dropdown"
      >
        <option value="">Chọn dự án…</option>
        {allProjects.map((proj) => (
          <option key={proj.id} value={proj.id}>
            {proj.projectCode} — {proj.name}
          </option>
        ))}
      </select>
    </label>
  );

  function wrapInHub(content: ReactNode) {
    if (!inHub || !activeNavItem || portalHashRequested) return content;
    return (
      <HubFrame
        title={activeNavItem.label}
        tabs={hubTabs}
        activeTab={activeTab}
        onSelect={goTo}
        toolbar={PROJECT_SCOPED_TABS.includes(activeTab) ? projectPicker : undefined}
      >
        {content}
      </HubFrame>
    );
  }

  return (
    <div className="app-frame">
      {/* Nguoi dung ban phim khong phai Tab qua ca menu dieu huong moi toi duoc noi dung. */}
      <a className="skip-link" href="#noi-dung-chinh">Bỏ qua điều hướng, tới nội dung chính</a>

      {/* Bảng lệnh Ctrl/⌘+K — nhảy tới bất kỳ màn hình nào không cần rời bàn phím. */}
      <CommandPalette
        items={[
          ...navGroups.flatMap((group) =>
            group.items.flatMap((i) =>
              i.tabs && i.tabs.length > 1
                ? i.tabs.map((leaf) => ({ id: leaf.tab, label: leaf.label, group: i.label, icon: i.icon }))
                : [{ id: entryTabOf(i, currentRoles), label: i.label, group: group.paletteLabel, icon: i.icon }],
            ),
          ),
          { id: 'CHANGE_PASSWORD', label: 'Đổi mật khẩu', group: 'Tài khoản của tôi', icon: ICONS.key },
          { id: 'NOTIFICATIONS', label: 'Thông báo', group: 'Tài khoản của tôi', icon: ICONS.bell },
          {
            id: 'NOTIFICATION_PREFERENCES',
            label: 'Cài đặt nhận thông báo',
            group: 'Tài khoản của tôi',
            icon: ICONS.settings,
          },
          ...accountLeaves.map((leaf) => ({ id: leaf.tab, label: leaf.label, group: 'Tài khoản của tôi', icon: ICONS.shield })),
        ]}
        onSelect={(id) => {
          leavePortalHash();
          setActiveTab(id as Tab);
        }}
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
            {navGroups.map((group, index) => (
              <Fragment key={group.id}>
                {group.label !== null ? (
                  <div className="side-nav__group-label">{!sidebarCollapsed ? group.label : ''}</div>
                ) : (
                  index > 0 && <div className="side-nav__group-gap" aria-hidden="true" />
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
            {/* Một mắt xích duy nhất sẽ trùng y tiêu đề trang ngay bên dưới — chỉ hiện khi có đường dẫn thật. */}
            {(() => {
              const crumbs = breadcrumbFor();
              return crumbs.length > 1 ? <Breadcrumb crumbs={crumbs} /> : null;
            })()}
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
            {/* Trên điện thoại gợi ý phím tắt bị ẩn (không có bàn phím) — vẫn cần một lối vào
                bảng lệnh để nhảy thẳng tới màn hình, nên hiện thành nút icon. */}
            <button
              type="button"
              className="icon-btn cmdk-mobile"
              aria-label="Tìm nhanh"
              title="Tìm nhanh"
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            >
              {ICONS.search}
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
                    <button
                      type="button"
                      className="notif-panel__mark-all"
                      onClick={handleMarkAllFromBell}
                      disabled={unreadCount === 0}
                      data-testid="notif-panel-mark-all"
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  </div>

                  {notifLoading ? (
                    <div className="notif-panel__empty">
                      <p>Đang tải…</p>
                    </div>
                  ) : (
                    <NotificationList
                      notifications={notifications}
                      onOpen={handleOpenNotificationFromBell}
                      onMarkRead={handleMarkNotificationRead}
                      openingId={notifOpeningId}
                      emptyText={notifTab === 'UNREAD' ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo nào'}
                    />
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
                    className="user-chip__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setActiveTab('NOTIFICATION_PREFERENCES');
                      setUserMenuOpen(false);
                    }}
                    data-testid="menu-notification-preferences"
                  >
                    {ICONS.settings} Cài đặt nhận thông báo
                  </button>
                  {accountLeaves.map((leaf) => (
                    <button
                      key={leaf.tab}
                      type="button"
                      className="user-chip__menu-item"
                      role="menuitem"
                      onClick={() => {
                        goTo(leaf.tab);
                        setUserMenuOpen(false);
                      }}
                      data-testid={`menu-${leaf.tab.toLowerCase()}`}
                    >
                      {ICONS.shield} {leaf.label}
                    </button>
                  ))}
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
          {/* Man hinh chua tai xong ma (hiem — da tai san luc ranh): giu khung trong, khong nhay con quay. */}
          <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
          {wrapInHub(portalHashRequested ? (
            // NCL-13-CN-002-TC-04: tài khoản nội bộ mở đường dẫn cổng khách hàng → từ chối + backend ghi nhật ký.
            <PortalAccessDeniedPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              feature={portalFeatureOf(portalHashValue)}
              onLeave={leavePortalHash}
            />
          ) : activeTab === 'CHANGE_PASSWORD' ? (
            <ChangePasswordPage onBack={() => setActiveTab(defaultTab)} onPasswordChanged={handleLogout} />
          ) : activeTab === 'NOTIFICATIONS' ? (
            <NotificationCenterPage
              onNavigate={navigateToNotification}
              onUnreadCountChange={setUnreadCount}
              onOpenPreferences={() => setActiveTab('NOTIFICATION_PREFERENCES')}
            />
          ) : activeTab === 'NOTIFICATION_PREFERENCES' ? (
            <NotificationPreferencePage onBack={() => setActiveTab('NOTIFICATIONS')} />
          ) : activeTab === 'BACKUP_RESTORE' ? (
            <BackupRestorePage currentUserRoles={currentRoles} onViewAuditLog={() => setActiveTab('SYSTEM_AUDIT_LOG')} />
          ) : activeTab === 'DATA_IMPORT' ? (
            <DataImportPage currentUserRoles={currentRoles} onViewAuditLog={() => setActiveTab('SYSTEM_AUDIT_LOG')} />
          ) : activeTab === 'COMPANY_SETTINGS' ? (
            <CompanySettingPage
              currentUserRoles={currentRoles}
              onViewAuditLog={() => setActiveTab('SYSTEM_AUDIT_LOG')}
              onViewFiscalPeriods={() => setActiveTab('FISCAL_PERIODS')}
            />
          ) : activeTab === 'FISCAL_PERIODS' ? (
            <FiscalPeriodPage
              currentUserRoles={currentRoles}
              onOpenCompanySettings={currentRoles.includes('VT-07') ? () => setActiveTab('COMPANY_SETTINGS') : undefined}
            />
          ) : activeTab === 'SERVICE_CATALOG' ? (
            <ServiceCatalogPage currentUserRoles={currentRoles} onViewAuditLog={() => setActiveTab('SYSTEM_AUDIT_LOG')} />
          ) : activeTab === 'NOTIFICATION_DEDUP' ? (
            <NotificationDedupConfigPage
              currentUserRoles={currentRoles}
              onViewAuditLog={() => setActiveTab('SYSTEM_AUDIT_LOG')}
            />
          ) : activeTab === 'MY_WORK' ? (
            <MyWorkPage currentUserRoles={currentRoles} currentUserName={session.fullName} currentUserId={session.userId} />
          ) : activeTab === 'PROJECTS' || ((activeTab === 'PROJECT_DETAIL' || activeTab === 'PROJECT_RISKS') && !selectedProjectId) ? (
            <ProjectListPage
              currentUserRoles={currentRoles}
              onOpen={(project) => {
                setSelectedProjectId(project.id);
                // Kế toán không được đọc chi tiết dự án (backend 403) — mở thẳng số liệu lợi nhuận.
                goTo(canOpenProjectDetail ? 'PROJECT_DETAIL' : 'PROJECT_MARGIN');
              }}
              onOpenAcceptance={
                currentRoles.includes('VT-02')
                  ? (project) => {
                      setSelectedProjectId(project.id);
                      goTo('ACCEPTANCES');
                    }
                  : undefined
              }
              onOpenProfit={(project) => {
                setSelectedProjectId(project.id);
                goTo('PROJECT_MARGIN');
              }}
            />
          ) : activeTab === 'PROJECT_DETAIL' && selectedProjectId ? (
            <ProjectDetailPage
              key={selectedProjectId}
              projectId={selectedProjectId}
              initialProject={allProjects.find((p) => p.id === selectedProjectId)}
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onBack={() => goTo('PROJECTS')}
              onOpenRisks={() => goTo('PROJECT_RISKS')}
              onOpenAcceptance={currentRoles.includes('VT-02') ? () => goTo('ACCEPTANCES') : undefined}
              onOpenProfit={() => goTo('PROJECT_MARGIN')}
            />
          ) : activeTab === 'PROJECT_RISKS' && selectedProjectId ? (
            <ProjectRiskPage
              key={selectedProjectId}
              projectId={selectedProjectId}
              currentUserRoles={currentRoles}
              currentUserId={session.userId}
              onBack={() => goTo('PROJECT_DETAIL')}
            />
          ) : activeTab === 'TIMESHEET_APPROVAL' ? (
            <TimesheetApprovalPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onNavigateToAdjustment={() => setActiveTab('TIMESHEET_ADJUSTMENT')}
            />
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
          ) : activeTab === 'MARGIN_BY_CUSTOMER' ? (
            <MarginByCustomerPage currentUserRoles={currentRoles} />
          ) : activeTab === 'MARGIN_BY_EMPLOYEE' ? (
            <MarginByEmployeePage currentUserRoles={currentRoles} />
          ) : PROJECT_SCOPED_TABS.includes(activeTab) && !selectedProjectId ? (
            <div className="table-empty-state hub-empty" data-testid="profitability-no-project">
              <span className="empty-icon">{ICONS.briefcase}</span>
              <h3>Chọn một dự án</h3>
              <p>Số liệu lợi nhuận luôn tính theo từng dự án.</p>
            </div>
          ) : activeTab === 'PROJECT_RECOGNIZED_REVENUE' && selectedProjectId ? (
            <ProjectRecognizedRevenuePage key={selectedProjectId} projectId={selectedProjectId} currentUserRoles={currentRoles} />
          ) : activeTab === 'PROJECT_MARGIN' && selectedProjectId ? (
            <ProjectMarginPage key={selectedProjectId} projectId={selectedProjectId} currentUserRoles={currentRoles} />
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
              onOpenDetail={(id) => {
                setSelectedContractId(id);
                setActiveTab('CONTRACT_DETAIL');
              }}
            />
          ) : activeTab === 'CONTRACT_DETAIL' && selectedContractId ? (
            <ContractDetailPage
              contractId={selectedContractId}
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onBack={() => setActiveTab('CONTRACTS')}
            />
          ) : activeTab === 'INVOICES' ? (
            <InvoicesPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onOpenInvoice={(id) => {
                setSelectedInvoiceId(id);
                setActiveTab('INVOICE_DETAIL');
              }}
            />
          ) : activeTab === 'INVOICE_DETAIL' && selectedInvoiceId ? (
            <InvoiceDetailPage
              invoiceId={selectedInvoiceId}
              onBack={() => setActiveTab('INVOICES')}
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
            />
          ) : activeTab === 'ACCEPTANCE_DETAIL' && selectedAcceptanceId ? (
            <AcceptanceDetailPage
              key={selectedAcceptanceId}
              certificateId={selectedAcceptanceId}
              currentUserRoles={currentRoles}
              onBack={() => setActiveTab('ACCEPTANCES')}
            />
          ) : activeTab === 'DELIVERABLES' ? (
            <DeliverablePage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              currentUserId={session.userId}
              projects={allProjects}
              selectedProjectId={acceptanceProjectId}
              onSelectProject={setAcceptanceProjectId}
            />
          ) : activeTab === 'ACCEPTANCES' || activeTab === 'ACCEPTANCE_DETAIL' ? (
            <AcceptanceListPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              currentUserId={session.userId}
              projects={allProjects}
              selectedProjectId={acceptanceProjectId}
              onSelectProject={setAcceptanceProjectId}
              onOpenCertificate={(id) => {
                setSelectedAcceptanceId(id);
                setActiveTab('ACCEPTANCE_DETAIL');
              }}
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
            <ReportCatalogPage currentUserRoles={currentRoles} onOpen={goTo} />
          ) : activeTab === 'OPERATIONAL_DASHBOARD' ? (
            <DashboardPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onBack={() => setActiveTab('REPORTS')}
              onViewNegativeMarginProjects={() => setActiveTab('PROJECT_MARGIN')}
              onViewOverdueInvoices={() => setActiveTab('INVOICES')}
            />
          ) : activeTab === 'REVENUE_REPORT' ? (
            <RevenueReportPage currentUserRoles={currentRoles} />
          ) : activeTab === 'TIMESHEET_REPORT' ? (
            <TimesheetReportPage currentUserRoles={currentRoles} />
          ) : activeTab === 'REPORT_EXPORT' ? (
            <ReportExportPage currentUserRoles={currentRoles} />
          ) : activeTab === 'PIPELINE_REPORT' ? (
            <PipelineReportPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onViewOpportunity={(id) => {
                setFocusOpportunityId(id);
                setActiveTab('OPPORTUNITIES');
              }}
            />
          ) : activeTab === 'UTILIZATION_REPORT' ? (
            <UtilizationReportPage currentUserRoles={currentRoles} onBack={() => setActiveTab('REPORTS')} />
          ) : activeTab === 'PROJECT_PERFORMANCE_REPORT' ? (
            <ProjectPerformanceReportPage
              currentUserRoles={currentRoles}
              onBack={() => setActiveTab('REPORTS')}
              onViewProject={(id) => {
                setSelectedProjectId(id);
                setActiveTab('PROJECT_MARGIN');
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
          ) : activeTab === 'PORTAL_ACCOUNTS' ? (
            <PortalAccountPage
              currentUserRoles={currentRoles}
              currentUserName={session.fullName}
              onViewAuditLog={() => setActiveTab('SYSTEM_AUDIT_LOG')}
            />
          ) : activeTab === 'SYSTEM_AUDIT_LOG' ? (
            <AuditLogPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'AUDIT_LOG' ? (
            <SensitiveAccessLogPage currentUserRoles={currentRoles} currentUserName={session.fullName} />
          ) : activeTab === 'MASKING_RULES' ? (
            <MaskingRulePage currentUserRoles={currentRoles} />
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
            <ProjectLaborCostPage key={selectedProjectId} projectId={selectedProjectId} currentUserRoles={currentRoles} />
          ) : activeTab === 'PLANNED_VS_ACTUAL' && selectedProjectId ? (
            <PlannedVsActualPage key={selectedProjectId} projectId={selectedProjectId} currentUserRoles={currentRoles} />
          ) : activeTab === 'PROFIT_FORECAST' && selectedProjectId ? (
            <ProfitForecastPage key={selectedProjectId} projectId={selectedProjectId} currentUserRoles={currentRoles} />
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
              <OpportunityListPage
                currentUserRoles={currentRoles}
                currentUserName={session.fullName}
                onOpenActivities={(id, name) => {
                  setSelectedOpportunityId(id);
                  setSelectedOpportunityName(name);
                  setActivityOrigin('LIST');
                }}
                focusOpportunityId={focusOpportunityId}
                onFocusConsumed={() => setFocusOpportunityId(null)}
              />
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
          ))}
          </Suspense>
        </main>
        </div>
      </div>

      {wbsFocus && (
        <ProjectWbsModal
          isOpen
          onClose={() => setWbsFocus(null)}
          projectId={wbsFocus.projectId}
          projectCode={wbsFocus.project?.projectCode}
          projectName={wbsFocus.project?.name}
          currentUserRoles={currentRoles}
          currentUserId={session.userId}
          focusTaskId={wbsFocus.taskId}
        />
      )}

      {appToast && (
        <div
          className={`toast-notification toast-notification--${appToast.type}`}
          role="alert"
          aria-live="polite"
          data-testid="app-toast"
        >
          <div className="toast-notification__content">
            <span className="toast-notification__icon">
              {appToast.type === 'success' ? ICONS.checkCircle : appToast.type === 'error' ? ICONS.alertTriangle : ICONS.info}
            </span>
            <span className="toast-notification__text">{appToast.message}</span>
          </div>
          <button
            type="button"
            className="toast-notification__close"
            onClick={() => setAppToast(null)}
            aria-label="Đóng thông báo"
          >
            <span className="icon-sm">{ICONS.close}</span>
          </button>
        </div>
      )}
    </div>
  );
}
