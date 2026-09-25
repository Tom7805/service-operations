import type { Tab } from './menuConfig';

/**
 * Nguon DUY NHAT cua cac lenh import() dong cho tung trang.
 *
 * App.tsx dung chinh cac ham nay cho React.lazy(), con thanh ben / bang lenh goi
 * `prefetchTab()` khi nguoi dung re chuot hoac focus vao mot muc — cung mot ham
 * import() nen trinh duyet chi tai chunk MOT lan va module da "am" san khi nguoi
 * dung thuc su bam. Them trang moi: khai bao loader o day + gan vao TAB_PAGES.
 */
export const PAGE_LOADERS = {
  UserListPage: () => import('../modules/users/pages/UserListPage'),
  UserDetailPage: () => import('../modules/users/pages/UserDetailPage'),
  RolePermissionPage: () => import('../modules/users/pages/RolePermissionPage'),
  DepartmentTreePage: () => import('../modules/departments/pages/DepartmentTreePage'),
  SensitiveAccessLogPage: () => import('../modules/auditLog/pages/SensitiveAccessLogPage'),
  AuditLogPage: () => import('../modules/auditLog/pages/AuditLogPage'),
  EmployeeListPage: () => import('../modules/employees/pages/EmployeeListPage'),
  EmployeeDetailPage: () => import('../modules/employees/pages/EmployeeDetailPage'),
  ChangePasswordPage: () => import('../modules/auth/pages/ChangePasswordPage'),
  TwoFactorSetupPage: () => import('../modules/auth/pages/TwoFactorSetupPage'),
  CustomerListPage: () => import('../modules/customers/pages/CustomerListPage'),
  CustomerMergePage: () => import('../modules/customers/pages/CustomerMergePage'),
  ContractListPage: () => import('../modules/contracts/pages/ContractListPage'),
  ContractDetailPage: () => import('../modules/contracts/pages/ContractDetailPage'),
  InvoicesPage: () => import('../modules/invoices/pages/InvoicesPage'),
  InvoiceDetailPage: () => import('../modules/invoices/pages/InvoiceDetailPage'),
  AcceptanceListPage: () => import('../modules/acceptance/pages/AcceptanceListPage'),
  AcceptanceDetailPage: () => import('../modules/acceptance/pages/AcceptanceDetailPage'),
  DeliverablePage: () => import('../modules/acceptance/pages/DeliverablePage'),
  BillRatePage: () => import('../modules/rates/pages/BillRatePage'),
  RateHistoryPage: () => import('../modules/rates/pages/RateHistoryPage'),
  OpportunityDetailPage: () => import('../modules/opportunities/pages/OpportunityDetailPage'),
  OpportunityListPage: () => import('../modules/opportunities/pages/OpportunityListPage'),
  RevenueForecastPage: () => import('../modules/opportunities/pages/RevenueForecastPage'),
  PipelineReportPage: () => import('../modules/reports/pages/PipelineReportPage'),
  DashboardPage: () => import('../modules/reports/pages/DashboardPage'),
  UtilizationReportPage: () => import('../modules/reports/pages/UtilizationReportPage'),
  ProjectPerformanceReportPage: () => import('../modules/reports/pages/ProjectPerformanceReportPage'),
  ReportExportPage: () => import('../modules/reports/pages/ReportExportPage'),
  RevenueReportPage: () => import('../modules/reports/pages/RevenueReportPage'),
  TimesheetReportPage: () => import('../modules/reports/pages/TimesheetReportPage'),
  MyWorkPage: () => import('../modules/mytasks/pages/MyWorkPage'),
  TimesheetApprovalPage: () => import('../modules/timesheets/pages/TimesheetApprovalPage'),
  TimesheetRejectPage: () => import('../modules/timesheets/pages/TimesheetRejectPage'),
  TimesheetAdjustmentPage: () => import('../modules/timesheets/pages/TimesheetAdjustmentPage'),
  TimesheetPeriodPage: () => import('../modules/timesheets/pages/TimesheetPeriodPage'),
  UnsubmittedTimesheetsPage: () => import('../modules/timesheets/pages/UnsubmittedTimesheetsPage'),
  ExpenseApprovalPage: () => import('../modules/expenses/pages/ExpenseApprovalPage'),
  OverheadAllocationPage: () => import('../modules/expenses/pages/OverheadAllocationPage'),
  MarginByCustomerPage: () => import('../modules/profitability/pages/MarginByCustomerPage'),
  MarginByEmployeePage: () => import('../modules/profitability/pages/MarginByEmployeePage'),
  ProjectLaborCostPage: () => import('../modules/profitability/pages/ProjectLaborCostPage'),
  PlannedVsActualPage: () => import('../modules/profitability/pages/PlannedVsActualPage'),
  ProfitForecastPage: () => import('../modules/profitability/pages/ProfitForecastPage'),
  ProjectRecognizedRevenuePage: () => import('../modules/profitability/pages/ProjectRecognizedRevenuePage'),
  ProjectMarginPage: () => import('../modules/profitability/pages/ProjectMarginPage'),
  MarginAlertThresholdPage: () => import('../modules/profitability/pages/MarginAlertThresholdPage'),
  NotificationCenterPage: () => import('../modules/notifications/pages/NotificationCenterPage'),
  PortalAccountPage: () => import('../modules/portal/pages/PortalAccountPage'),
  PortalAccessDeniedPage: () => import('../modules/portal/pages/PortalAccessDeniedPage'),
  PortalApp: () => import('../modules/portal/PortalApp'),
} as const;

export type PageKey = keyof typeof PAGE_LOADERS;

/**
 * Tab -> cac trang ma tab do co the render (khop voi chuoi dieu kien trong App.tsx).
 * Kieu Record<Tab, ...> bat buoc liet ke DU moi tab: them tab moi ma quen o day
 * thi tsc bao loi ngay.
 */
const TAB_PAGES: Record<Tab, readonly PageKey[]> = {
  CHANGE_PASSWORD: ['ChangePasswordPage'],
  NOTIFICATIONS: ['NotificationCenterPage'],
  MY_WORK: ['MyWorkPage'],
  TIMESHEET_APPROVAL: ['TimesheetApprovalPage'],
  TIMESHEET_REJECT: ['TimesheetRejectPage'],
  TIMESHEET_ADJUSTMENT: ['TimesheetAdjustmentPage'],
  TIMESHEET_PERIOD: ['TimesheetPeriodPage'],
  UNSUBMITTED_TIMESHEETS: ['UnsubmittedTimesheetsPage'],
  EXPENSE_APPROVAL: ['ExpenseApprovalPage'],
  OVERHEAD_ALLOCATION: ['OverheadAllocationPage'],
  MARGIN_BY_CUSTOMER: ['MarginByCustomerPage'],
  MARGIN_BY_EMPLOYEE: ['MarginByEmployeePage'],
  PROJECT_RECOGNIZED_REVENUE: ['ProjectRecognizedRevenuePage'],
  PROJECT_MARGIN: ['ProjectMarginPage'],
  MARGIN_ALERT_THRESHOLD: ['MarginAlertThresholdPage'],
  CUSTOMERS: ['CustomerListPage'],
  CONTRACTS: ['ContractListPage'],
  CONTRACT_DETAIL: ['ContractDetailPage'],
  INVOICES: ['InvoicesPage'],
  INVOICE_DETAIL: ['InvoiceDetailPage'],
  ACCEPTANCES: ['AcceptanceListPage'],
  ACCEPTANCE_DETAIL: ['AcceptanceDetailPage', 'AcceptanceListPage'],
  DELIVERABLES: ['DeliverablePage'],
  OPPORTUNITIES: ['OpportunityListPage'],
  OPPORTUNITY_DETAIL: ['OpportunityDetailPage'],
  REVENUE_FORECAST: ['RevenueForecastPage'],
  REPORTS: [],
  OPERATIONAL_DASHBOARD: ['DashboardPage'],
  REVENUE_REPORT: ['RevenueReportPage'],
  TIMESHEET_REPORT: ['TimesheetReportPage'],
  REPORT_EXPORT: ['ReportExportPage'],
  PIPELINE_REPORT: ['PipelineReportPage'],
  UTILIZATION_REPORT: ['UtilizationReportPage'],
  PROJECT_PERFORMANCE_REPORT: ['ProjectPerformanceReportPage'],
  CUSTOMER_MERGE: ['CustomerMergePage'],
  BILL_RATES: ['BillRatePage'],
  RATE_HISTORY: ['RateHistoryPage'],
  DEPARTMENTS: ['DepartmentTreePage'],
  PERMISSIONS: ['RolePermissionPage'],
  PORTAL_ACCOUNTS: ['PortalAccountPage'],
  SYSTEM_AUDIT_LOG: ['AuditLogPage'],
  AUDIT_LOG: ['SensitiveAccessLogPage'],
  TWO_FACTOR_SETTINGS: ['TwoFactorSetupPage'],
  EMPLOYEES: ['EmployeeListPage'],
  EMPLOYEE_DETAIL: ['EmployeeDetailPage'],
  PROJECT_LABOR_COST: ['ProjectLaborCostPage'],
  PLANNED_VS_ACTUAL: ['PlannedVsActualPage'],
  PROFIT_FORECAST: ['ProfitForecastPage'],
  USERS: ['UserListPage'],
  DETAIL: ['UserDetailPage'],
};

const prefetched = new Set<PageKey>();

/** Tai truoc chunk cua mot tab (khong render gi). Goi nhieu lan cung an toan. */
export function prefetchTab(tab: string): void {
  const pages = TAB_PAGES[tab as Tab];
  if (!pages) return;
  for (const key of pages) {
    if (prefetched.has(key)) continue;
    prefetched.add(key);
    // Loi mang khi tai truoc: bo qua va cho lan sau thu lai — lazy() se tu tai
    // lai khi nguoi dung that su mo trang.
    PAGE_LOADERS[key]().catch(() => prefetched.delete(key));
  }
}

/** Mang cham / che do tiet kiem du lieu: khong tai truoc de nguoi dung tai hien truong khoi ton 3G. */
export function shouldPrefetchInBackground(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  return !/(^|-)2g$/.test(conn.effectiveType ?? '');
}

type IdleHandle = number;

/** requestIdleCallback kem du phong setTimeout (Safari chua ho tro). Tra ve ham huy. */
export function runWhenIdle(cb: () => void, timeout = 2000): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => IdleHandle;
    cancelIdleCallback?: (h: IdleHandle) => void;
  };
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const h = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(h);
  }
  const t = window.setTimeout(cb, 1200);
  return () => window.clearTimeout(t);
}
