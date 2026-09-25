import {
  Fragment,
  Suspense,
  lazy,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
} from 'react';
import { List } from '@phosphor-icons/react';
import LoginPage from './modules/auth/pages/LoginPage';
import type { AuthSession } from './modules/auth/types/authTypes';
import { PAGE_LOADERS, prefetchTab, runWhenIdle, shouldPrefetchInBackground } from './layouts/pageLoaders';
import { focusableIn, useMediaQuery, whenElementAppears } from './layouts/shellHooks';
import { isPortalHash, portalFeatureOf } from './modules/portal/utils/portalRoute';
// Moi trang la mot chunk rieng. lazy() va prefetchTab() dung CHUNG ham import() trong
// PAGE_LOADERS, nen re chuot vao thanh ben la chunk da duoc tai san khi nguoi dung bam.
const UserListPage = lazy(PAGE_LOADERS.UserListPage);
const UserDetailPage = lazy(PAGE_LOADERS.UserDetailPage);
const RolePermissionPage = lazy(PAGE_LOADERS.RolePermissionPage);
const PortalAccountPage = lazy(PAGE_LOADERS.PortalAccountPage);
const PortalApp = lazy(PAGE_LOADERS.PortalApp);
const PortalAccessDeniedPage = lazy(PAGE_LOADERS.PortalAccessDeniedPage);

/** Đường dẫn `#/portal/...` của cổng khách hàng — tài khoản nội bộ mở vào sẽ bị từ chối (NCL-13-CN-002-TC-04). */
const readPortalHash = () => (isPortalHash(window.location.hash) ? window.location.hash : '');
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
import OpportunitySearchPicker from './modules/opportunities/components/OpportunitySearchPicker';
const OpportunityListPage = lazy(PAGE_LOADERS.OpportunityListPage);
const RevenueForecastPage = lazy(PAGE_LOADERS.RevenueForecastPage);
const PipelineReportPage = lazy(PAGE_LOADERS.PipelineReportPage);
const DashboardPage = lazy(PAGE_LOADERS.DashboardPage);
const UtilizationReportPage = lazy(PAGE_LOADERS.UtilizationReportPage);
const ProjectPerformanceReportPage = lazy(PAGE_LOADERS.ProjectPerformanceReportPage);
const ReportExportPage = lazy(PAGE_LOADERS.ReportExportPage);
const RevenueReportPage = lazy(PAGE_LOADERS.RevenueReportPage);
const TimesheetReportPage = lazy(PAGE_LOADERS.TimesheetReportPage);
const MyWorkPage = lazy(PAGE_LOADERS.MyWorkPage);
const TimesheetApprovalPage = lazy(PAGE_LOADERS.TimesheetApprovalPage);
const TimesheetRejectPage = lazy(PAGE_LOADERS.TimesheetRejectPage);
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
import NotificationList from './modules/notifications/components/NotificationList';
import { getNotifications, getUnreadCount, markNotificationsRead } from './modules/notifications/api/notificationsApi';
import type { NotificationRes } from './modules/notifications/types/notificationTypes';
import { getAllProjects } from './modules/projects/api/projectsApi';
import ProjectPicker from './modules/projects/components/ProjectPicker';
import type { ProjectRes } from './modules/projects/types/projectTypes';
import { ICONS } from './components/common/icons';
import CommandPalette, { type CommandItem } from './components/common/CommandPalette';
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

const APP_NAME = 'Vận hành dịch vụ';
/** Mảng rỗng ổn định khi chưa đăng nhập — tránh tạo mảng mới mỗi lần render làm các memo vô hiệu. */
const EMPTY_ROLES: string[] = [];
/** Man hinh truy cap tu menu tai khoan — khong nam trong ALL_NAV_ITEMS nhung van can ten. */
const ACCOUNT_TAB_LABELS: Partial<Record<Tab, string>> = {
  CHANGE_PASSWORD: 'Đổi mật khẩu',
  NOTIFICATIONS: 'Thông báo',
};
/** Khung hep: thanh ben thanh ngan keo (drawer) truot tu trai, co lop che. */
const COMPACT_QUERY = '(max-width: 900px)';
const UNREAD_POLL_MS = 30000;
/** So muc dau tien tren thanh ben duoc tai truoc khi trinh duyet ranh sau dang nhap. */
const IDLE_PREFETCH_COUNT = 4;

function readStoredSession(): AuthSession | null {
  const raw = localStorage.getItem('session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

/** Khung cho trong luc tai chunk cua trang — giu bo cuc on dinh thay vi nhay trang. */
function PageLoadingFallback() {
  return (
    <div className="page-loading" role="status" aria-live="polite" aria-label="Đang tải trang">
      <div className="skeleton skeleton-text page-loading__title" />
      <div className="skeleton page-loading__block" />
      <div className="skeleton page-loading__block page-loading__block--tall" />
    </div>
  );
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Di chuyen focus giua cac muc [role=menuitem] bang phim mui ten / Home / End. */
function moveMenuFocus(menu: HTMLElement, key: string): boolean {
  const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  if (items.length === 0) return false;
  const current = items.indexOf(document.activeElement as HTMLElement);
  let next: number;
  if (key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % items.length;
  else if (key === 'ArrowUp') next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
  else if (key === 'Home') next = 0;
  else if (key === 'End') next = items.length - 1;
  else return false;
  items[next].focus();
  return true;
}

type Setter<T> = Dispatch<SetStateAction<T>>;

/** Trang thai dieu huong giua cac man (id dang chon, nguon mo...). Gom thanh mot doi tuong
 *  da memo de PageContent chi render lai khi mot gia tri THUC SU doi. */
interface PageSelection {
  selectedUserId: number | null;
  selectedEmployeeId: number | null;
  selectedOpportunityId: number | null;
  selectedContractId: number | null;
  selectedProjectId: number | null;
  selectedInvoiceId: number | null;
  acceptanceProjectId: number | null;
  selectedAcceptanceId: number | null;
  selectedOpportunityName: string | undefined;
  activityOrigin: 'LIST' | 'PICKER' | null;
  focusOpportunityId: number | null;
}

/** Cac ham set state — on dinh qua moi lan render. */
interface PageSetters {
  setActiveTab: Setter<Tab>;
  setSelectedUserId: Setter<number | null>;
  setSelectedEmployeeId: Setter<number | null>;
  setSelectedOpportunityId: Setter<number | null>;
  setSelectedContractId: Setter<number | null>;
  setSelectedProjectId: Setter<number | null>;
  setSelectedInvoiceId: Setter<number | null>;
  setAcceptanceProjectId: Setter<number | null>;
  setSelectedAcceptanceId: Setter<number | null>;
  setSelectedOpportunityName: Setter<string | undefined>;
  setActivityOrigin: Setter<'LIST' | 'PICKER' | null>;
  setFocusOpportunityId: Setter<number | null>;
}

interface PageContentProps {
  activeTab: Tab;
  session: AuthSession;
  currentRoles: string[];
  defaultTab: Tab;
  allProjects: ProjectRes[];
  handleLogout: () => void;
  selection: PageSelection;
  setters: PageSetters;
}

/**
 * Noi dung trang dang mo. Tach khoi App va boc memo: mo chuong thong bao, menu tai
 * khoan, ngan keo dieu huong hay so chua doc doi (poll 30s) KHONG con render lai ca
 * trang dang xem (bang du lieu dai) nhu truoc — chi khi tab/phien/lua chon doi.
 */
const PageContent = memo(function PageContent({
  activeTab,
  session,
  currentRoles,
  defaultTab,
  allProjects,
  handleLogout,
  selection,
  setters,
}: PageContentProps) {
  const {
    selectedUserId,
    selectedEmployeeId,
    selectedOpportunityId,
    selectedContractId,
    selectedProjectId,
    selectedInvoiceId,
    acceptanceProjectId,
    selectedAcceptanceId,
    selectedOpportunityName,
    activityOrigin,
    focusOpportunityId,
  } = selection;
  const {
    setActiveTab,
    setSelectedUserId,
    setSelectedEmployeeId,
    setSelectedOpportunityId,
    setSelectedContractId,
    setSelectedProjectId,
    setSelectedInvoiceId,
    setAcceptanceProjectId,
    setSelectedAcceptanceId,
    setSelectedOpportunityName,
    setActivityOrigin,
    setFocusOpportunityId,
  } = setters;

  return (
    <>
      {activeTab === 'CHANGE_PASSWORD' ? (
        <ChangePasswordPage onBack={() => setActiveTab(defaultTab)} onPasswordChanged={handleLogout} />
      ) : activeTab === 'NOTIFICATIONS' ? (
        <NotificationCenterPage />
      ) : activeTab === 'MY_WORK' ? (
        <MyWorkPage currentUserRoles={currentRoles} currentUserName={session.fullName} currentUserId={session.userId} />
      ) : activeTab === 'TIMESHEET_APPROVAL' ? (
        <TimesheetApprovalPage
          currentUserRoles={currentRoles}
          currentUserName={session.fullName}
          onNavigateToAdjustment={() => setActiveTab('TIMESHEET_ADJUSTMENT')}
        />
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
      ) : activeTab === 'MARGIN_BY_CUSTOMER' ? (
        <MarginByCustomerPage currentUserRoles={currentRoles} />
      ) : activeTab === 'MARGIN_BY_EMPLOYEE' ? (
        <MarginByEmployeePage currentUserRoles={currentRoles} />
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

          <div className="project-picker-wrap">
            <ProjectPicker onSelect={setSelectedProjectId} testId="project-selector-dropdown" />
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

          <div className="project-picker-wrap">
            <ProjectPicker onSelect={setSelectedProjectId} testId="project-selector-dropdown" />
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
            {currentRoles.includes('VT-01') && (
              <button
                type="button"
                className="report-card"
                onClick={() => setActiveTab('OPERATIONAL_DASHBOARD')}
              >
                <span className="report-card__icon">{ICONS.chart}</span>
                <span className="report-card__body">
                  <span className="report-card__title">Bảng điều khiển vận hành</span>
                  <span className="report-card__desc">
                    Doanh thu ghi nhận, tỷ suất biên lợi nhuận, tỷ lệ giờ tính phí, dự án âm
                    biên và hóa đơn quá hạn của kỳ chọn.
                  </span>
                </span>
                <span className="report-card__arrow">{ICONS.arrowRight}</span>
              </button>
            )}
            {(currentRoles.includes('VT-01') || currentRoles.includes('VT-05')) && (
              <button
                type="button"
                className="report-card"
                onClick={() => setActiveTab('REVENUE_REPORT')}
              >
                <span className="report-card__icon">{ICONS.chart}</span>
                <span className="report-card__body">
                  <span className="report-card__title">Doanh thu theo tháng</span>
                  <span className="report-card__desc">
                    Doanh thu ghi nhận từng tháng, tách theo loại hợp đồng và so với cùng kỳ năm
                    trước.
                  </span>
                </span>
                <span className="report-card__arrow">{ICONS.arrowRight}</span>
              </button>
            )}
            {(currentRoles.includes('VT-01') || currentRoles.includes('VT-04')) && (
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
            )}
            {currentRoles.includes('VT-01') && (
              <button
                type="button"
                className="report-card"
                onClick={() => setActiveTab('UTILIZATION_REPORT')}
              >
                <span className="report-card__icon">{ICONS.users}</span>
                <span className="report-card__body">
                  <span className="report-card__title">Tỷ lệ giờ tính phí</span>
                  <span className="report-card__desc">
                    Giờ tính phí so với giờ làm việc chuẩn của kỳ, theo toàn công ty, từng bộ phận
                    và từng người.
                  </span>
                </span>
                <span className="report-card__arrow">{ICONS.arrowRight}</span>
              </button>
            )}
            {currentRoles.includes('VT-02') && (
              <button
                type="button"
                className="report-card"
                onClick={() => setActiveTab('PROJECT_PERFORMANCE_REPORT')}
              >
                <span className="report-card__icon">{ICONS.briefcase}</span>
                <span className="report-card__body">
                  <span className="report-card__title">Hiệu quả theo dự án</span>
                  <span className="report-card__desc">
                    So kế hoạch trong báo giá với thực tế: giờ công, doanh thu và biên lợi nhuận
                    của các dự án bạn quản lý.
                  </span>
                </span>
                <span className="report-card__arrow">{ICONS.arrowRight}</span>
              </button>
            )}
            {currentRoles.includes('VT-02') && (
              <button
                type="button"
                className="report-card"
                onClick={() => setActiveTab('TIMESHEET_REPORT')}
              >
                <span className="report-card__icon">{ICONS.clock}</span>
                <span className="report-card__body">
                  <span className="report-card__title">Giờ công theo nhân sự</span>
                  <span className="report-card__desc">
                    Giờ công đã duyệt của từng nhân sự trên từng dự án bạn quản lý, tách giờ có
                    tính phí và không tính phí.
                  </span>
                </span>
                <span className="report-card__arrow">{ICONS.arrowRight}</span>
              </button>
            )}
          </div>
        </div>
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

          <div className="project-picker-wrap">
            <ProjectPicker onSelect={setSelectedProjectId} testId="project-selector-dropdown" />
          </div>
        </div>
      ) : activeTab === 'PLANNED_VS_ACTUAL' && selectedProjectId ? (
        <PlannedVsActualPage
          projectId={selectedProjectId}
          currentUserRoles={currentRoles}
          onBack={() => { setSelectedProjectId(null); }}
        />
      ) : activeTab === 'PLANNED_VS_ACTUAL' ? (
        <div className="user-management-page">
          <div className="page-header">
            <div>
              <div className="page-header__kicker">
                <span className="page-header__tag">{ICONS.chart} SO SÁNH BIÊN LỢI NHUẬN</span>
                <span className="page-header__dot" />
                <span className="page-header__meta">CHƯA CHỌN DỰ ÁN</span>
              </div>
              <h1 className="page-title">Biên lợi nhuận dự kiến vs thực tế</h1>
              <p className="page-subtitle">
                Chọn một dự án để so sánh biên lợi nhuận dự kiến với thực tế.
              </p>
            </div>
          </div>

          <div className="project-picker-wrap">
            <ProjectPicker onSelect={setSelectedProjectId} testId="project-selector-dropdown-planned-vs-actual" />
          </div>
        </div>
      ) : activeTab === 'PROFIT_FORECAST' && selectedProjectId ? (
        <ProfitForecastPage
          projectId={selectedProjectId}
          currentUserRoles={currentRoles}
          onBack={() => { setSelectedProjectId(null); }}
        />
      ) : activeTab === 'PROFIT_FORECAST' ? (
        <div className="user-management-page">
          <div className="page-header">
            <div>
              <div className="page-header__kicker">
                <span className="page-header__tag">{ICONS.chart} DỰ BÁO LỢI NHUẬN</span>
                <span className="page-header__dot" />
                <span className="page-header__meta">CHƯA CHỌN DỰ ÁN</span>
              </div>
              <h1 className="page-title">Dự báo lợi nhuận tới khi kết thúc dự án</h1>
              <p className="page-subtitle">
                Chọn một dự án để xem dự báo lợi nhuận tới khi kết thúc.
              </p>
            </div>
          </div>

          <div className="project-picker-wrap">
            <ProjectPicker onSelect={setSelectedProjectId} testId="project-selector-dropdown-profit-forecast" />
          </div>
        </div>
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
    </>
  );
});

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
  // NCL-12-CN-001: dự án đang chọn ở màn Nghiệm thu được giữ lại khi mở/quay về từ chi tiết phiếu.
  const [acceptanceProjectId, setAcceptanceProjectId] = useState<number | null>(null);
  const [selectedAcceptanceId, setSelectedAcceptanceId] = useState<number | null>(null);

  // Danh sách dự án đầy đủ — chỉ còn màn Nghiệm thu / Sản phẩm bàn giao cần (lọc các dự án do
  // chính người dùng quản lý). Nạp khi mở các màn đó lần đầu, KHÔNG nạp sẵn lúc đăng nhập; các
  // màn Giá vốn/Biên lợi nhuận dùng ô chọn có tìm kiếm tải từng trang (ProjectPicker).
  const [allProjects, setAllProjects] = useState<ProjectRes[]>([]);
  const [allProjectsLoaded, setAllProjectsLoaded] = useState(false);
  const [selectedOpportunityName, setSelectedOpportunityName] = useState<string | undefined>(undefined);
  /** Nhớ người dùng vào màn "Ghi nhận chăm sóc" từ đâu để nút quay lại trả về
   *  đúng chỗ: từ danh sách "Cơ hội bán hàng" thì về lại danh sách, còn tự tìm
   *  trực tiếp trong tab "Cơ hội" thì quay về ô tìm kiếm. */
  const [activityOrigin, setActivityOrigin] = useState<'LIST' | 'PICKER' | null>(null);
  /** Từ báo cáo đường ống, bấm vào một cơ hội đọng lâu thì nhảy sang "Cơ hội
   *  bán hàng" và tự mở đúng cơ hội đó lên để xử lý ngay (chuyển giai đoạn/
   *  chốt kết quả), thay vì chỉ biết mỗi con số ID không thao tác được gì. */
  const [focusOpportunityId, setFocusOpportunityId] = useState<number | null>(null);
  const [portalHashValue, setPortalHashValue] = useState<string>(readPortalHash);
  const portalHashRequested = portalHashValue !== '';
  useEffect(() => {
    const onHash = () => setPortalHashValue(readPortalHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const leavePortalHash = useCallback(() => {
    if (!isPortalHash(window.location.hash)) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setPortalHashValue('');
  }, []);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);
  const userMenuListRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<NotificationRes[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifTriggerRef = useRef<HTMLButtonElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('sidebarCollapsed') === '1'
  );
  // Khung hep (dien thoai / may tinh bang doc): thanh ben la ngan keo dong/mo.
  const isCompact = useMediaQuery(COMPACT_QUERY);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const drawerActive = isCompact && mobileNavOpen;
  // Tren ngan keo luon hien nhan chu — che do chi-icon la lua chon cua may ban.
  const navCollapsed = sidebarCollapsed && !isCompact;
  const sideNavRef = useRef<HTMLElement>(null);
  const appMainRef = useRef<HTMLDivElement>(null);
  const navToggleRef = useRef<HTMLButtonElement>(null);
  /** Dong ngan keo bang Esc/lop che/nut dong thi tra focus ve nut mo; dong do DIEU HUONG
   *  thi de focus chuyen vao tieu de trang moi. */
  const restoreNavFocusRef = useRef(false);

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

  const persistSession = useCallback((next: AuthSession) => {
    localStorage.setItem('token', next.accessToken);
    localStorage.setItem('session', JSON.stringify(next));
    setSession(next);
  }, []);

  const handleAuthenticated = useCallback(
    (newSession: AuthSession) => {
      persistSession(newSession);
    },
    [persistSession]
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('session');
    setSession(null);
  }, []);

  // NCL-01-CN-004 TC-03: admin đổi vai trò ở tab/máy khác → phiên này áp dụng ngay
  // (làm mới khi focus lại + poll 30s), không bắt đăng nhập lại; 401 thì đăng xuất.
  useSessionSync({ session, onRefresh: persistSession, onExpired: handleLogout });

  // Nạp danh sách dự án đầy đủ khi lần đầu mở màn Nghiệm thu / Sản phẩm bàn giao.
  const needsAllProjects =
    activeTab === 'ACCEPTANCES' || activeTab === 'ACCEPTANCE_DETAIL' || activeTab === 'DELIVERABLES';
  useEffect(() => {
    // Tài khoản cổng (VT-09) không được gọi API nội bộ — backend sẽ trả 403 và ghi nhật ký từ chối.
    if (!session || session.roles.includes('VT-09') || !needsAllProjects || allProjectsLoaded) return;
    let cancelled = false;
    void (async () => {
      try {
        const projects = await getAllProjects();
        if (!cancelled) {
          setAllProjects(projects);
          setAllProjectsLoaded(true);
        }
      } catch {
        // Bỏ qua lỗi nạp danh sách dự án — các trang liên quan vẫn hoạt động, chỉ thiếu dropdown.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, needsAllProjects, allProjectsLoaded]);

  // Đổi tài khoản (đăng xuất/đăng nhập lại) → bỏ danh sách dự án của phiên cũ.
  useEffect(() => {
    setAllProjects([]);
    setAllProjectsLoaded(false);
  }, [session?.userId]);

  // NCL-06-CN-009: chấm đỏ trên chuông thông báo phản ánh đúng số chưa đọc thật (gồm cả
  // TIMESHEET_REMINDER) — nạp ngay khi đăng nhập rồi làm mới định kỳ mỗi 30 giây.
  // Tab bị ẩn thì DỪNG nhịp (đỡ pin/3G cho máy mở cả ngày ở hiện trường); hiện lại
  // thì nạp ngay một lần rồi chạy lại nhịp 30s.
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
    let interval: number | undefined;
    const start = () => {
      if (interval === undefined) interval = window.setInterval(fetchUnread, UNREAD_POLL_MS);
    };
    const stop = () => {
      if (interval !== undefined) window.clearInterval(interval);
      interval = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        void fetchUnread();
        start();
      }
    };
    void fetchUnread();
    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
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

  const handleMarkNotificationRead = useCallback(async (notification: NotificationRes) => {
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationsRead([notification.id]);
    } catch {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: false } : n)));
      setUnreadCount((c) => c + 1);
    }
  }, []);

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
  const currentRoles = useMemo(() => sessionRoles ?? EMPTY_ROLES, [sessionRoles]);
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

  const activeNavItem = useMemo(
    () =>
      ALL_NAV_ITEMS.find((item) => item.tab === activeTab) ??
      ALL_NAV_ITEMS.find((item) => (item.matches ?? []).includes(activeTab)),
    [activeTab]
  );
  const pageLabel = activeNavItem?.label ?? ACCOUNT_TAB_LABELS[activeTab];

  // Tiêu đề tab trình duyệt theo màn đang mở — phân biệt được khi mở nhiều tab,
  // và là thứ trình đọc màn hình đọc lên đầu tiên.
  useEffect(() => {
    document.title = session && pageLabel ? `${pageLabel} · ${APP_NAME}` : APP_NAME;
  }, [session, pageLabel]);

  // Bảng lệnh: danh sách mục + handler ổn định, không dựng lại mảng mỗi lần App render
  // (mở chuông, đổi số chưa đọc...).
  const paletteItems = useMemo<CommandItem[]>(
    () => [
      ...navGroups.flatMap((group) =>
        group.items.map((i) => ({ id: i.tab, label: i.label, group: group.paletteLabel, icon: i.icon })),
      ),
      { id: 'CHANGE_PASSWORD', label: 'Đổi mật khẩu', group: 'Tài khoản của tôi', icon: ICONS.key },
      { id: 'NOTIFICATIONS', label: 'Thông báo', group: 'Tài khoản của tôi', icon: ICONS.bell },
    ],
    [navGroups]
  );
  const handlePaletteSelect = useCallback(
    (id: string) => {
      leavePortalHash();
      setActiveTab(id as Tab);
    },
    [leavePortalHash],
  );

  // Tải trước chunk khi trình duyệt rảnh sau đăng nhập: tab mặc định + vài mục đầu của
  // thanh bên — nơi người dùng gần như chắc chắn sẽ bấm tiếp. Bỏ qua khi tiết kiệm dữ liệu.
  const loggedIn = session !== null;
  useEffect(() => {
    if (!loggedIn || !shouldPrefetchInBackground()) return;
    return runWhenIdle(() => {
      prefetchTab(defaultTab);
      navGroups
        .flatMap((g) => g.items)
        .slice(0, IDLE_PREFETCH_COUNT)
        .forEach((item) => prefetchTab(item.tab));
    });
  }, [loggedIn, defaultTab, navGroups]);

  // ---- Đổi trang: cuộn về đầu, đóng ngăn kéo, đưa focus tới tiêu đề trang mới ----
  const isFirstTabRender = useRef(true);
  useEffect(() => {
    if (isFirstTabRender.current) {
      isFirstTabRender.current = false;
      return;
    }
    setMobileNavOpen(false);
    // .app-main là vùng cuộn duy nhất và KHÔNG bị remount theo tab — trang mới phải bắt đầu từ đầu.
    if (appMainRef.current) appMainRef.current.scrollTop = 0;
    const main = document.getElementById('noi-dung-chinh');
    if (!main || typeof MutationObserver === 'undefined') return;
    const focusTarget = (el: HTMLElement) => {
      // Trang tự đặt focus (ô tìm kiếm...) hoặc người dùng đã bấm vào đâu đó thì không giành lại.
      const active = document.activeElement;
      if (active && active !== document.body && active !== main && main.contains(active)) return;
      // Hộp thoại khác đang mở (bảng lệnh, modal của trang) thì để focus ở đó.
      if (document.querySelector('[aria-modal="true"]:not(#app-side-nav)')) return;
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    };
    // Trang là chunk lazy: đợi tiêu đề thật xuất hiện (bỏ qua khung xương), tối đa 4s.
    return whenElementAppears(main, 'h1, h2', focusTarget, 4000, () => focusTarget(main));
  }, [activeTab]);

  // ---- Ngăn kéo điều hướng trên màn hẹp ----
  const openMobileNav = useCallback(() => {
    setUserMenuOpen(false);
    setNotifOpen(false);
    setMobileNavOpen(true);
  }, []);
  const closeMobileNav = useCallback(() => {
    restoreNavFocusRef.current = true;
    setMobileNavOpen(false);
  }, []);

  // Rời khung hẹp (xoay ngang máy tính bảng, kéo rộng cửa sổ) thì bỏ trạng thái ngăn kéo.
  useEffect(() => {
    if (!isCompact) setMobileNavOpen(false);
  }, [isCompact]);

  useEffect(() => {
    if (!drawerActive) return;
    const nav = sideNavRef.current;
    const mainArea = appMainRef.current;
    const root = document.documentElement;
    const toggle = navToggleRef.current;
    // Khóa cuộn nền + làm vùng nội dung "trơ" (không focus/không đọc được) khi ngăn kéo mở.
    root.classList.add('shell-nav-locked');
    mainArea?.setAttribute('inert', '');
    mainArea?.setAttribute('aria-hidden', 'true');
    const first =
      nav?.querySelector<HTMLElement>('.side-nav__item--active') ??
      (nav ? focusableIn(nav)[0] : undefined);
    first?.focus({ preventScroll: false });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobileNav();
        return;
      }
      if (e.key !== 'Tab' || !nav) return;
      const items = focusableIn(nav);
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === firstEl || !nav.contains(document.activeElement))) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (document.activeElement === lastEl || !nav.contains(document.activeElement))) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      root.classList.remove('shell-nav-locked');
      mainArea?.removeAttribute('inert');
      mainArea?.removeAttribute('aria-hidden');
      if (restoreNavFocusRef.current) toggle?.focus();
      restoreNavFocusRef.current = false;
    };
  }, [drawerActive, closeMobileNav]);

  // ---- Chuông thông báo + menu tài khoản: Esc đóng, focus trở về nút mở ----
  useEffect(() => {
    if (!notifOpen && !userMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (notifOpen) {
        setNotifOpen(false);
        notifTriggerRef.current?.focus();
      }
      if (userMenuOpen) {
        setUserMenuOpen(false);
        userTriggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [notifOpen, userMenuOpen]);

  // Mở menu tài khoản → focus mục đầu (mẫu menu button của WAI-ARIA).
  useEffect(() => {
    if (!userMenuOpen) return;
    userMenuListRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [userMenuOpen]);

  // Mở bảng thông báo → focus vào tab đang chọn để bàn phím đi tiếp được ngay.
  useEffect(() => {
    if (!notifOpen) return;
    notifPanelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
  }, [notifOpen]);

  const handleUserMenuKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      // Tab ra khỏi menu = rời menu; không giữ menu treo lơ lửng sau lưng focus.
      setUserMenuOpen(false);
      return;
    }
    if (moveMenuFocus(e.currentTarget, e.key)) e.preventDefault();
  }, []);

  const handleUserTriggerKeyDown = useCallback((e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setNotifOpen(false);
      setUserMenuOpen(true);
    }
  }, []);

  const handleNotifTabsKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button'));
    const i = tabs.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].focus();
  }, []);

  /** Focus rời hẳn khỏi cụm (Tab đi tiếp) thì đóng; click ra ngoài đã có mousedown lo. */
  const closeOnFocusOut = useCallback(
    (close: () => void) => (e: ReactFocusEvent<HTMLDivElement>) => {
      const next = e.relatedTarget as Node | null;
      if (next && !e.currentTarget.contains(next)) close();
    },
    []
  );
  const handleNotifBlur = useMemo(() => closeOnFocusOut(() => setNotifOpen(false)), [closeOnFocusOut]);
  const handleUserBlur = useMemo(() => closeOnFocusOut(() => setUserMenuOpen(false)), [closeOnFocusOut]);

  const selection = useMemo<PageSelection>(
    () => ({
      selectedUserId,
      selectedEmployeeId,
      selectedOpportunityId,
      selectedContractId,
      selectedProjectId,
      selectedInvoiceId,
      acceptanceProjectId,
      selectedAcceptanceId,
      selectedOpportunityName,
      activityOrigin,
      focusOpportunityId,
    }),
    [
      selectedUserId,
      selectedEmployeeId,
      selectedOpportunityId,
      selectedContractId,
      selectedProjectId,
      selectedInvoiceId,
      acceptanceProjectId,
      selectedAcceptanceId,
      selectedOpportunityName,
      activityOrigin,
      focusOpportunityId,
    ]
  );
  // Các setter của useState vốn ổn định — gom một lần là đủ.
  const setters = useMemo<PageSetters>(
    () => ({
      setActiveTab,
      setSelectedUserId,
      setSelectedEmployeeId,
      setSelectedOpportunityId,
      setSelectedContractId,
      setSelectedProjectId,
      setSelectedInvoiceId,
      setAcceptanceProjectId,
      setSelectedAcceptanceId,
      setSelectedOpportunityName,
      setActivityOrigin,
      setFocusOpportunityId,
    }),
    []
  );

  // Danh sách mục thanh bên — chỉ dựng lại khi tab/vai trò/trạng thái thu gọn đổi,
  // không phải mỗi lần mở chuông hay số chưa đọc đổi.
  const navList = useMemo(() => {
    const renderNavGroup = (items: NavItem[]) =>
      items.map((item) => {
        const isActive = activeTab === item.tab || (item.matches ?? []).includes(activeTab);
        // `items` ở đây luôn là mục đã lọc theo vai trò (qua navGroupsFor), nên không
        // còn mục bị khóa hoàn toàn. Chỉ mục "chỉ xem" (viewOnlyHint) vẫn hiện — người
        // dùng vẫn xem được đường ống bán hàng; mục chặn hẳn đã ẩn ở navGroupsFor.
        const isViewOnlyForUser = !canAccess(item, currentRoles) && Boolean(item.viewOnlyHint);
        const title = isViewOnlyForUser ? item.viewOnlyHint : navCollapsed ? item.label : undefined;
        return (
          <button
            key={item.tab}
            type="button"
            className={`side-nav__item ${isActive ? 'side-nav__item--active' : ''}`}
            title={title}
            aria-label={navCollapsed ? item.label : undefined}
            onClick={() => {
              leavePortalHash();
              setActiveTab(item.tab);
              // Bấm lại đúng mục đang mở cũng phải đóng ngăn kéo (activeTab không đổi).
              setMobileNavOpen(false);
            }}
            // Rê chuột / focus bàn phím = ý định rõ ràng → tải trước chunk của trang.
            onPointerEnter={() => prefetchTab(item.tab)}
            onFocus={() => prefetchTab(item.tab)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="side-nav__item__icon" aria-hidden="true">
              {item.icon}
            </span>
            {!navCollapsed && <span className="side-nav__item__label">{item.label}</span>}
            {!navCollapsed && isViewOnlyForUser && (
              <span className="side-nav__item__view-only" aria-label="Chế độ chỉ xem">
                Chỉ xem
              </span>
            )}
          </button>
        );
      });

    return navGroups.map((group) => (
      <Fragment key={group.id}>
        {group.label !== null && (
          <div className="side-nav__group-label">{!navCollapsed ? group.label : ''}</div>
        )}
        {renderNavGroup(group.items)}
      </Fragment>
    ));
  }, [navGroups, activeTab, currentRoles, navCollapsed, leavePortalHash]);

  if (!session) return <LoginPage onAuthenticated={handleAuthenticated} />;

  // Epic NCL-13: tài khoản Khách hàng (VT-09) dùng giao diện cổng riêng — không vào giao diện nội bộ (QTN-26).
  if (isPortalUser) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <PortalApp session={session} onLogout={handleLogout} />
      </Suspense>
    );
  }

  return (
    <div className="app-frame">
      {/* Nguoi dung ban phim khong phai Tab qua ca menu dieu huong moi toi duoc noi dung. */}
      <a className="skip-link" href="#noi-dung-chinh">Bỏ qua điều hướng, tới nội dung chính</a>

      {/* Bảng lệnh Ctrl/⌘+K — nhảy tới bất kỳ màn hình nào không cần rời bàn phím. */}
      <CommandPalette items={paletteItems} onSelect={handlePaletteSelect} onPreview={prefetchTab} />

      <div className="app-shell">
        {/* Lớp che phía sau ngăn kéo điều hướng (chỉ trên màn hẹp). Chạm ra ngoài = đóng. */}
        {drawerActive && <div className="side-nav-scrim" aria-hidden="true" onClick={closeMobileNav} />}
        <aside
          ref={sideNavRef}
          id="app-side-nav"
          className={`side-nav ${navCollapsed ? 'side-nav--collapsed' : ''} ${drawerActive ? 'side-nav--drawer-open' : ''}`}
          role={drawerActive ? 'dialog' : undefined}
          aria-modal={drawerActive ? true : undefined}
          aria-label={drawerActive ? 'Điều hướng' : undefined}
        >
          <div className="side-nav__header">
            <div className="side-nav__brand">
              <span className="side-nav__brand-mark">
                <i />
                <i />
                <i />
              </span>
              {!navCollapsed && (
                <span className="side-nav__brand-text">
                  Vận hành <b>dịch vụ</b>
                </span>
              )}
            </div>
            {isCompact ? (
              <button
                type="button"
                className="side-nav__toggle"
                onClick={closeMobileNav}
                title="Đóng menu điều hướng"
                aria-label="Đóng menu điều hướng"
              >
                {ICONS.close}
              </button>
            ) : (
              <button
                type="button"
                className="side-nav__toggle"
                onClick={() => setSidebarCollapsed((v) => !v)}
                title={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
                aria-label={sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
                aria-expanded={!sidebarCollapsed}
                aria-controls="app-side-nav"
              >
                {ICONS.panelToggle}
              </button>
            )}
          </div>

          <nav className="side-nav__list" aria-label="Điều hướng chính">
            {navList}
          </nav>
        </aside>

        <div className="app-main" ref={appMainRef}>
        <div className="app-topbar-glow" aria-hidden="true" />
        <header className="app-topbar">
          <div className="app-topbar__brand">
            <button
              ref={navToggleRef}
              type="button"
              className="icon-btn app-topbar__nav-btn"
              onClick={openMobileNav}
              aria-label="Mở menu điều hướng"
              aria-expanded={drawerActive}
              aria-controls="app-side-nav"
            >
              <List weight="bold" aria-hidden="true" />
            </button>
            <h1 className="app-topbar__title">{portalHashRequested ? 'Cổng khách hàng' : pageLabel ?? APP_NAME}</h1>
          </div>

          <div className="app-topbar__actions">
            {/* Phím tắt phải nhìn thấy được thì mới có người dùng. Nút này vừa là chỉ dẫn,
                vừa là lối vào cho người dùng chuột. */}
            <button
              type="button"
              className="cmdk-hint"
              title="Mở bảng lệnh (Ctrl K)"
              aria-keyshortcuts="Control+K Meta+K"
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            >
              {ICONS.search}
              <span>Tìm nhanh</span>
              <kbd className="cmdk__kbd">Ctrl K</kbd>
            </button>
            <button type="button" className="icon-btn" title="Trợ giúp" aria-label="Trợ giúp">
              {ICONS.helpCircle}
            </button>
            <div className="notif" ref={notifRef} onBlur={handleNotifBlur}>
              <button
                ref={notifTriggerRef}
                type="button"
                className="icon-btn"
                title="Thông báo"
                aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
                aria-haspopup="dialog"
                aria-expanded={notifOpen}
                aria-controls={notifOpen ? 'shell-notif-panel' : undefined}
                onClick={() => {
                  setUserMenuOpen(false);
                  setNotifOpen((open) => !open);
                }}
                data-testid="btn-notif-bell"
              >
                {ICONS.bell}
                {unreadCount > 0 && (
                  <span className="notif-badge" data-testid="notif-unread-badge" aria-hidden="true">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  ref={notifPanelRef}
                  id="shell-notif-panel"
                  className="notif-panel"
                  role="dialog"
                  aria-label="Thông báo"
                  data-testid="notif-panel"
                >
                  <div
                    className="notif-panel__tabs"
                    role="group"
                    aria-label="Lọc thông báo"
                    onKeyDown={handleNotifTabsKeyDown}
                  >
                    <button
                      type="button"
                      className={`notif-panel__tab ${notifTab === 'ALL' ? 'notif-panel__tab--active' : ''}`}
                      aria-pressed={notifTab === 'ALL'}
                      onClick={() => setNotifTab('ALL')}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`notif-panel__tab ${notifTab === 'UNREAD' ? 'notif-panel__tab--active' : ''}`}
                      aria-pressed={notifTab === 'UNREAD'}
                      onClick={() => setNotifTab('UNREAD')}
                      data-testid="notif-tab-unread"
                    >
                      Chưa đọc
                    </button>
                    <span className="notif-panel__tabs-spacer" />
                  </div>

                  <div aria-busy={notifLoading}>
                    {notifLoading ? (
                      <div className="notif-panel__empty" role="status">
                        <p>Đang tải…</p>
                      </div>
                    ) : (
                      <NotificationList notifications={notifications} onMarkRead={handleMarkNotificationRead} />
                    )}
                  </div>

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

            <div className="user-chip" ref={userMenuRef} onBlur={handleUserBlur}>
              <button
                ref={userTriggerRef}
                type="button"
                className={`user-chip__trigger ${userMenuOpen ? 'user-chip__trigger--open' : ''}`}
                onClick={() => {
                  setNotifOpen(false);
                  setUserMenuOpen((open) => !open);
                }}
                onKeyDown={handleUserTriggerKeyDown}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-controls={userMenuOpen ? 'shell-user-menu' : undefined}
                aria-label={`Tài khoản: ${session.fullName}`}
              >
                <span className="avatar-circle" aria-hidden="true">{getInitials(session.fullName)}</span>
                <span className="user-chip__name">{session.fullName}</span>
                <span className="user-chip__chevron" aria-hidden="true">{ICONS.chevronDown}</span>
              </button>

              {userMenuOpen && (
                <div
                  ref={userMenuListRef}
                  id="shell-user-menu"
                  className="user-chip__menu"
                  role="menu"
                  aria-label="Tài khoản"
                  onKeyDown={handleUserMenuKeyDown}
                >
                  <div className="user-chip__menu-header" role="presentation">
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
                    tabIndex={-1}
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
                    tabIndex={-1}
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
          {/* Moi trang la mot chunk rieng (React.lazy) — chi tai khi mo lan dau. Khung
              xuong chi hien sau 150ms (.page-loading) nen chunk da tai san khong nhay. */}
          <Suspense fallback={<PageLoadingFallback />}>
            {portalHashRequested ? (
              // NCL-13-CN-002-TC-04: tài khoản nội bộ mở đường dẫn cổng khách hàng → từ chối + backend ghi nhật ký.
              <PortalAccessDeniedPage
                currentUserRoles={currentRoles}
                currentUserName={session.fullName}
                feature={portalFeatureOf(portalHashValue)}
                onLeave={leavePortalHash}
              />
            ) : (
            <PageContent
              activeTab={activeTab}
              session={session}
              currentRoles={currentRoles}
              defaultTab={defaultTab}
              allProjects={allProjects}
              handleLogout={handleLogout}
              selection={selection}
              setters={setters}
            />
            )}
          </Suspense>
        </main>
        </div>
      </div>
    </div>
  );
}
