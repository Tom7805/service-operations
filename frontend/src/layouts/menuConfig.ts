import type { ReactNode } from 'react';
import { ICONS } from '../components/common/icons';

/**
 * Các màn hình (tab) trong ứng dụng. Mỗi giá trị tương ứng với một khối nội dung được render trong
 * <main> của App.tsx.
 */
export type Tab =
  | 'CUSTOMERS'
  | 'CONTRACTS'
  | 'CONTRACT_DETAIL'
  | 'OPPORTUNITIES'
  | 'REVENUE_FORECAST'
  | 'CUSTOMER_MERGE'
  | 'BILL_RATES'
  | 'RATE_HISTORY'
  | 'INVOICES'
  | 'INVOICE_DETAIL'
  | 'ACCEPTANCES'
  | 'ACCEPTANCE_DETAIL'
  | 'DELIVERABLES'
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
  | 'MY_SETTINGS'
  | 'TWO_FACTOR_SETTINGS'
  | 'MASKING_RULES'
  | 'REPORTS'
  | 'PIPELINE_REPORT'
  | 'OPERATIONAL_DASHBOARD'
  | 'UTILIZATION_REPORT'
  | 'PROJECT_PERFORMANCE_REPORT'
  | 'REPORT_EXPORT'
  | 'REVENUE_REPORT'
  | 'TIMESHEET_REPORT'
  | 'MY_WORK'
  | 'PROJECTS'
  | 'PROJECT_DETAIL'
  | 'PROJECT_RISKS'
  | 'TIMESHEET_APPROVAL'
  | 'TIMESHEET_ADJUSTMENT'
  | 'TIMESHEET_PERIOD'
  | 'UNSUBMITTED_TIMESHEETS'
  | 'EXPENSE_APPROVAL'
  | 'OVERHEAD_ALLOCATION'
  | 'MARGIN_BY_CUSTOMER'
  | 'MARGIN_BY_EMPLOYEE'
  | 'PROJECT_LABOR_COST'
  | 'PLANNED_VS_ACTUAL'
  | 'PROFIT_FORECAST'
  | 'PROJECT_RECOGNIZED_REVENUE'
  | 'PROJECT_MARGIN'
  | 'MARGIN_ALERT_THRESHOLD'
  | 'PORTAL_ACCOUNTS'
  | 'NOTIFICATIONS'
  | 'NOTIFICATION_PREFERENCES'
  | 'NOTIFICATION_DEDUP'
  | 'SERVICE_CATALOG'
  | 'COMPANY_SETTINGS'
  | 'FISCAL_PERIODS'
  | 'BACKUP_RESTORE'
  | 'DATA_IMPORT';

/** Một màn hình có thể điều hướng tới: một mục sidebar đơn lẻ, hoặc một tab bên trong khu làm việc. */
export interface NavLeaf {
  tab: Tab;
  label: string;
  /**
   * Vai trò cần có để thấy màn hình này. CHỈ quyết định hiển thị trên giao diện (sidebar, tab, bảng lệnh)
   * — cổng bảo mật thật vẫn nằm trong từng trang và ở backend.
   */
  requires?: string[];
  /** Màn hình con (chi tiết, báo cáo con) vẫn tô sáng mục này. */
  matches?: Tab[];
}

/**
 * Một mục trên sidebar. Có `tabs` thì đây là **khu làm việc**: nhiều màn hình cùng một việc, mở bằng dải
 * tab bên trong thay vì mỗi màn hình một mục sidebar. Khi đó `tab`/`requires` của chính mục bị bỏ qua —
 * mục hiện nếu người dùng thấy ít nhất một tab, và mở vào tab đầu tiên họ thấy.
 */
export interface NavItem extends NavLeaf {
  id: string;
  icon: ReactNode;
  tabs?: NavLeaf[];
}

export interface NavGroup {
  id: string;
  /** Nhãn nhóm trên sidebar; null = không nhãn. */
  label: string | null;
  /** Nhãn nhóm trong bảng lệnh Ctrl+K. */
  paletteLabel: string;
  items: NavItem[];
}

const WORK: NavItem[] = [
  { id: 'my-work', tab: 'MY_WORK', icon: ICONS.clock, label: 'Việc của tôi' },
  // Điểm vào của mọi việc theo dự án. Kế toán chỉ xem danh sách (bấm dự án mở thẳng Lợi nhuận) — backend
  // không cho Kế toán đọc chi tiết/WBS dự án.
  {
    id: 'projects', tab: 'PROJECTS', icon: ICONS.folder, label: 'Dự án',
    requires: ['VT-01', 'VT-02', 'VT-05'], matches: ['PROJECT_DETAIL', 'PROJECT_RISKS'],
  },
  {
    id: 'timesheet-review', tab: 'TIMESHEET_APPROVAL', icon: ICONS.checkCircle, label: 'Duyệt giờ công',
    // Duyệt và từ chối nằm chung một hàng chờ (ApprovalActionBar có cả hai nút).
    tabs: [
      { tab: 'TIMESHEET_APPROVAL', label: 'Chờ duyệt', requires: ['VT-02'] },
      { tab: 'UNSUBMITTED_TIMESHEETS', label: 'Chưa nộp', requires: ['VT-02'] },
      { tab: 'TIMESHEET_ADJUSTMENT', label: 'Điều chỉnh', requires: ['VT-02'] },
    ],
  },
];

const BUSINESS: NavItem[] = [
  { id: 'customers', tab: 'CUSTOMERS', icon: ICONS.building, label: 'Khách hàng', requires: ['VT-04', 'VT-02'] },
  {
    id: 'opportunities', tab: 'OPPORTUNITIES', icon: ICONS.target, label: 'Cơ hội',
    // Backend chỉ mở danh sách cơ hội cho VT-01/VT-02/VT-04.
    requires: ['VT-01', 'VT-02', 'VT-04'], matches: ['OPPORTUNITY_DETAIL'],
  },
  {
    id: 'acceptance', tab: 'ACCEPTANCES', icon: ICONS.check, label: 'Nghiệm thu',
    tabs: [
      { tab: 'ACCEPTANCES', label: 'Phiếu nghiệm thu', requires: ['VT-02'], matches: ['ACCEPTANCE_DETAIL'] },
      { tab: 'DELIVERABLES', label: 'Sản phẩm bàn giao', requires: ['VT-02'] },
    ],
  },
];

const FINANCE: NavItem[] = [
  // Hợp đồng và Hóa đơn cố ý giữ hai mục riêng (người dùng đã chọn như vậy).
  { id: 'contracts', tab: 'CONTRACTS', icon: ICONS.handshake, label: 'Hợp đồng', requires: ['VT-05'], matches: ['CONTRACT_DETAIL'] },
  { id: 'invoices', tab: 'INVOICES', icon: ICONS.receipt, label: 'Hóa đơn', requires: ['VT-05'], matches: ['INVOICE_DETAIL'] },
  {
    id: 'expenses', tab: 'EXPENSE_APPROVAL', icon: ICONS.listChecks, label: 'Chi phí',
    tabs: [
      { tab: 'EXPENSE_APPROVAL', label: 'Chờ duyệt', requires: ['VT-05'] },
      { tab: 'OVERHEAD_ALLOCATION', label: 'Phân bổ chi phí chung', requires: ['VT-05'] },
    ],
  },
  { id: 'timesheet-period', tab: 'TIMESHEET_PERIOD', icon: ICONS.lock, label: 'Kỳ chấm công', requires: ['VT-05'] },
  {
    id: 'profitability', tab: 'PROJECT_MARGIN', icon: ICONS.percent, label: 'Lợi nhuận dự án',
    // Năm màn hình đầu cùng xem MỘT dự án — khu làm việc có một ô chọn dự án dùng chung (App.tsx).
    tabs: [
      { tab: 'PROJECT_MARGIN', label: 'Biên lợi nhuận', requires: ['VT-01', 'VT-02', 'VT-05'] },
      { tab: 'PROJECT_LABOR_COST', label: 'Giá vốn', requires: ['VT-01', 'VT-02', 'VT-05'] },
      { tab: 'PROJECT_RECOGNIZED_REVENUE', label: 'Doanh thu', requires: ['VT-01', 'VT-05'] },
      { tab: 'PLANNED_VS_ACTUAL', label: 'Kế hoạch và thực tế', requires: ['VT-02'] },
      { tab: 'PROFIT_FORECAST', label: 'Dự báo', requires: ['VT-02'] },
      // Ngưỡng áp dụng cho mọi dự án; VT-02/VT-05 chỉ xem, riêng VT-01 được đổi (trang tự kiểm tra).
      { tab: 'MARGIN_ALERT_THRESHOLD', label: 'Ngưỡng cảnh báo', requires: ['VT-01', 'VT-02', 'VT-05'] },
    ],
  },
  {
    id: 'rates', tab: 'BILL_RATES', icon: ICONS.coins, label: 'Đơn giá',
    tabs: [
      { tab: 'BILL_RATES', label: 'Bảng đơn giá', requires: ['VT-05', 'VT-07'] },
      { tab: 'RATE_HISTORY', label: 'Lịch sử thay đổi', requires: ['VT-05', 'VT-07'] },
    ],
  },
];

/** Báo cáo con mở từ danh mục báo cáo — tên dùng cho đường dẫn trên thanh tiêu đề. */
export const REPORT_CHILD_LABELS: Partial<Record<Tab, string>> = {
  OPERATIONAL_DASHBOARD: 'Bảng điều khiển',
  REVENUE_REPORT: 'Doanh thu theo tháng',
  REVENUE_FORECAST: 'Dự báo doanh thu',
  PIPELINE_REPORT: 'Đường ống bán hàng',
  UTILIZATION_REPORT: 'Tỷ lệ giờ tính phí',
  PROJECT_PERFORMANCE_REPORT: 'Hiệu quả dự án',
  TIMESHEET_REPORT: 'Giờ công theo nhân sự',
  MARGIN_BY_CUSTOMER: 'Lợi nhuận theo khách hàng',
  MARGIN_BY_EMPLOYEE: 'Lợi nhuận theo nhân sự',
  REPORT_EXPORT: 'Xuất báo cáo',
  FISCAL_PERIODS: 'Kỳ tài chính',
};

const REPORTS: NavItem[] = [
  {
    id: 'reports', tab: 'REPORTS', icon: ICONS.document, label: 'Báo cáo',
    // Danh mục báo cáo tự lọc thẻ theo vai trò; từng trang báo cáo cũng tự chặn vai trò không đúng.
    requires: ['VT-01', 'VT-02', 'VT-04', 'VT-05'],
    matches: Object.keys(REPORT_CHILD_LABELS) as Tab[],
  },
];

const ADMIN: NavItem[] = [
  { id: 'departments', tab: 'DEPARTMENTS', icon: ICONS.tree, label: 'Tổ chức', requires: ['VT-07'] },
  {
    id: 'accounts', tab: 'USERS', icon: ICONS.user, label: 'Tài khoản',
    tabs: [
      { tab: 'USERS', label: 'Nhân viên', requires: ['VT-07'], matches: ['DETAIL'] },
      { tab: 'PORTAL_ACCOUNTS', label: 'Khách hàng', requires: ['VT-07'] },
      { tab: 'PERMISSIONS', label: 'Phân quyền', requires: ['VT-07'] },
    ],
  },
  { id: 'employees', tab: 'EMPLOYEES', icon: ICONS.users, label: 'Nhân sự', requires: ['VT-06', 'VT-07'], matches: ['EMPLOYEE_DETAIL'] },
  { id: 'service-catalog', tab: 'SERVICE_CATALOG', icon: ICONS.tag, label: 'Danh mục dịch vụ', requires: ['VT-07'] },
  {
    id: 'data', tab: 'DATA_IMPORT', icon: ICONS.save, label: 'Dữ liệu',
    tabs: [
      { tab: 'DATA_IMPORT', label: 'Nhập từ tệp', requires: ['VT-07'] },
      { tab: 'CUSTOMER_MERGE', label: 'Gộp khách hàng trùng', requires: ['VT-07'] },
      { tab: 'BACKUP_RESTORE', label: 'Sao lưu và phục hồi', requires: ['VT-07'] },
    ],
  },
  {
    id: 'logs', tab: 'SYSTEM_AUDIT_LOG', icon: ICONS.clipboardList, label: 'Nhật ký',
    tabs: [
      { tab: 'SYSTEM_AUDIT_LOG', label: 'Thao tác', requires: ['VT-07'] },
      { tab: 'AUDIT_LOG', label: 'Truy cập dữ liệu nhạy cảm', requires: ['VT-07'] },
    ],
  },
  {
    // "Cài đặt" (chân thanh bên) là tùy chọn CÁ NHÂN của mọi người dùng; mục này là cấu hình cả hệ thống
    // của Quản trị viên — đặt tên khác để hai thứ không lẫn vào nhau.
    id: 'settings', tab: 'COMPANY_SETTINGS', icon: ICONS.wrench, label: 'Cấu hình hệ thống',
    tabs: [
      { tab: 'COMPANY_SETTINGS', label: 'Công ty', requires: ['VT-07'], matches: ['FISCAL_PERIODS'] },
      { tab: 'NOTIFICATION_DEDUP', label: 'Thông báo', requires: ['VT-07'] },
      { tab: 'TWO_FACTOR_SETTINGS', label: 'Xác thực hai bước', requires: ['VT-07'] },
    ],
  },
];

/** Tất cả nhóm, theo thứ tự hiển thị trên sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'work', label: null, paletteLabel: 'Công việc', items: WORK },
  { id: 'business', label: 'Kinh doanh', paletteLabel: 'Kinh doanh', items: BUSINESS },
  { id: 'finance', label: 'Tài chính', paletteLabel: 'Tài chính', items: FINANCE },
  { id: 'reports', label: null, paletteLabel: 'Báo cáo', items: REPORTS },
  { id: 'admin', label: 'Quản trị', paletteLabel: 'Quản trị', items: ADMIN },
];

/** Tất cả mục sidebar (theo thứ tự nhóm). */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Mọi màn hình điều hướng được: mục đơn lẻ, hoặc từng tab của khu làm việc. */
export const ALL_NAV_LEAVES: NavLeaf[] = ALL_NAV_ITEMS.flatMap((item) => item.tabs ?? [item]);

/** Màn hình luôn mở được qua menu tài khoản, không nằm trên sidebar. */
const ACCOUNT_TABS: Tab[] = ['CHANGE_PASSWORD', 'NOTIFICATIONS', 'NOTIFICATION_PREFERENCES', 'MY_SETTINGS'];

/**
 * Màn hình của menu tài khoản chỉ dành cho một số vai trò.
 *
 * "Quyền xem dữ liệu" (NCL-01-CN-005) từng nằm trong "Cài đặt", nhưng quy tắc che lương/giá vốn là CỐ
 * ĐỊNH (QTN-02) nên trang chỉ để đọc — đặt dưới "Cài đặt" khiến người dùng chờ một thứ chỉnh được mà
 * không có. Nó là thông tin về quyền của chính tài khoản, nên nằm cạnh "Đổi mật khẩu".
 */
export const ACCOUNT_LEAVES: NavLeaf[] = [
  // Nhân sự, Kế toán, Ban giám đốc — đúng nhóm được xem số liệu lương/giá vốn thật (QTN-02).
  { tab: 'MASKING_RULES', label: 'Quyền xem dữ liệu', requires: ['VT-01', 'VT-05', 'VT-06'] },
];

/** Màn hình tài khoản (có phân quyền) mà người dùng mở được. */
export function accountLeavesFor(roles: readonly string[] = []): NavLeaf[] {
  return ACCOUNT_LEAVES.filter((leaf) => canAccess(leaf, roles));
}

export function canAccess(leaf: NavLeaf, roles: readonly string[] = []): boolean {
  return !leaf.requires || leaf.requires.some((role) => roles.includes(role));
}

/** Các tab của một mục mà người dùng thấy được (mục đơn lẻ: chính nó). */
export function visibleTabsOf(item: NavItem, roles: readonly string[] = []): NavLeaf[] {
  return (item.tabs ?? [item]).filter((leaf) => canAccess(leaf, roles));
}

export function isItemVisible(item: NavItem, roles: readonly string[] = []): boolean {
  return visibleTabsOf(item, roles).length > 0;
}

/** Màn hình người dùng thấy được, theo thứ tự sidebar (tab của khu làm việc liệt kê lần lượt). */
export function visibleNavLeaves(roles: readonly string[] = []): NavLeaf[] {
  return ALL_NAV_ITEMS.flatMap((item) => visibleTabsOf(item, roles));
}

/** Nhóm có ít nhất một mục hiển thị; mỗi mục chỉ giữ các tab người dùng thấy được. */
export function navGroupsFor(roles: readonly string[] = []): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => isItemVisible(item, roles))
      .map((item) => (item.tabs ? { ...item, tabs: visibleTabsOf(item, roles) } : item)),
  })).filter((group) => group.items.length > 0);
}

/** Màn hình mở ra khi bấm mục trên sidebar: tab đầu tiên người dùng thấy được. */
export function entryTabOf(item: NavItem, roles: readonly string[] = []): Tab {
  return visibleTabsOf(item, roles)[0]?.tab ?? item.tab;
}

/** Tab (hoặc màn hình con của nó) có thuộc về màn hình `leaf` không. */
function leafOwns(leaf: NavLeaf, tab: Tab): boolean {
  return leaf.tab === tab || (leaf.matches ?? []).includes(tab);
}

/** Mục sidebar chứa màn hình `tab` (trực tiếp, là tab của khu làm việc, hoặc là màn hình con). */
export function findNavItem(tab: Tab): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => (item.tabs ?? [item]).some((leaf) => leafOwns(leaf, tab)));
}

/** Tab của khu làm việc đang chứa màn hình `tab` (để tô sáng đúng tab khi đang ở màn hình con). */
export function findLeaf(tab: Tab): NavLeaf | undefined {
  return ALL_NAV_LEAVES.find((leaf) => leafOwns(leaf, tab));
}

/** Nhóm chứa mục `item` — dùng cho đường dẫn trên thanh tiêu đề. */
export function groupOf(item: NavItem): NavGroup | undefined {
  return NAV_GROUPS.find((group) => group.items.some((i) => i.id === item.id));
}

/**
 * Màn hình mặc định khi đăng nhập hoặc vai trò thay đổi: Quản trị viên vào "Tổ chức", còn lại vào màn
 * hình đầu tiên họ thấy — luôn là "Việc của tôi" vì mục này không yêu cầu vai trò nào.
 */
export function defaultTabFor(roles: readonly string[] = []): Tab {
  const visible = visibleNavLeaves(roles);
  if (visible.some((leaf) => leaf.tab === 'DEPARTMENTS')) return 'DEPARTMENTS';
  return visible[0]?.tab ?? 'MY_WORK';
}

/** Người dùng có được ở lại màn hình `tab` với vai trò hiện tại không (dùng khi vai trò bị thu hẹp). */
export function isTabVisible(tab: Tab, roles: readonly string[] = []): boolean {
  if (ACCOUNT_TABS.includes(tab)) return true;
  if (ACCOUNT_LEAVES.some((leaf) => leafOwns(leaf, tab) && canAccess(leaf, roles))) return true;
  const owners = ALL_NAV_LEAVES.filter((leaf) => leafOwns(leaf, tab));
  // Một màn hình có thể thuộc nhiều nơi (vd "Kỳ tài chính": báo cáo của VT-01/02/05, đồng thời mở từ
  // "Cài đặt › Công ty" của VT-07) — thấy được nếu thấy một trong các nơi đó.
  return owners.some((leaf) => canAccess(leaf, roles));
}
