import type { ReactNode } from 'react';
import { ICONS } from '../components/common/icons';

/**
 * Các thẻ (tab) điều hướng trong ứng dụng. Mỗi giá trị tương ứng với một khối
 * nội dung được render trong <main> của App.tsx.
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
  | 'REPORT_EXPORT'
  | 'REVENUE_REPORT'
  | 'TIMESHEET_REPORT'
  | 'MY_WORK'
  | 'TIMESHEET_APPROVAL'
  | 'TIMESHEET_REJECT'
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
  | 'NOTIFICATIONS';

export interface NavItem {
  tab: Tab;
  icon: ReactNode;
  label: string;
  /** Các tab con cũng nên tô sáng mục điều hướng này (ví dụ trang chi tiết). */
  matches?: Tab[];
  /**
   * Vai trò cần có để dùng được màn hình này. CHỈ dùng để quyết định hiển thị
   * trên giao diện (sidebar / bảng lệnh) — cổng bảo mật thật vẫn nằm trong từng
   * trang và ở backend, không đổi.
   */
  requires?: string[];
  /**
   * Đặt khi trang KHÔNG chặn hẳn người thiếu `requires` mà chỉ hạ xuống chế độ
   * xem (ví dụ "Cơ hội bán hàng": ai cũng xem được đường ống, chỉ riêng thao
   * tác tạo/chuyển giai đoạn mới cần đúng vai trò). Nếu để trống, mặc định coi
   * là chặn hẳn (mục bị ẩn khỏi thanh điều hướng nếu không có vai trò).
   */
  viewOnlyHint?: string;
}

/** Nhóm mục điều hướng. `label` — nhãn trên sidebar (null = nhóm đầu tiên, không
 * nhãn); `paletteLabel` — nhãn dùng cho bảng lệnh Ctrl+K (ghi đè thành 'Chấm công'
 * khi label null để giống hành vi cũ). */
export interface NavGroup {
  id: string;
  /** Nhãn trên thanh bên (null = không có nhãn, nhóm đầu tiên). */
  label: string | null;
  /** Nhãn dùng cho bảng lệnh Ctrl+K. */
  paletteLabel: string;
  items: NavItem[];
}

/** Chấm công — nhóm đầu tiên, không cần nhãn riêng vì đã ở đầu danh sách. */
export const TIMESHEET_NAV_ITEMS: NavItem[] = [
  // NCL-05-CN-003/004 + NCL-06-CN-001/002 gộp chung một màn: công việc được giao (mọi
  // vai trò, quyền thật nằng ở backend) cộng bảng giờ công tuần (phần ghi/nộp giờ công
  // chỉ hiện cho VT-03 ngay trong trang, vì TimeEntryController chỉ mở cho vai trò này).
  { tab: 'MY_WORK', icon: ICONS.clock, label: 'Công việc và giờ công' },
  { tab: 'TIMESHEET_APPROVAL', icon: ICONS.checkCircle, label: 'Duyệt bảng chấm công', requires: ['VT-02'] },
  { tab: 'TIMESHEET_REJECT', icon: ICONS.close, label: 'Từ chối bảng chấm công', requires: ['VT-02'] },
  { tab: 'TIMESHEET_ADJUSTMENT', icon: ICONS.edit, label: 'Điều chỉnh giờ công đã duyệt', requires: ['VT-02'] },
  { tab: 'TIMESHEET_PERIOD', icon: ICONS.lock, label: 'Khóa kỳ chấm công', requires: ['VT-05'] },
  { tab: 'UNSUBMITTED_TIMESHEETS', icon: ICONS.clock, label: 'Nhân sự chưa nộp', requires: ['VT-02', 'VT-03'] },
];

/** Kinh doanh — khách hàng, hợp đồng, cơ hội bán hàng, doanh thu, báo cáo. */
export const BUSINESS_NAV_ITEMS: NavItem[] = [
  { tab: 'CUSTOMERS', icon: ICONS.building, label: 'Khách hàng', requires: ['VT-04', 'VT-02'] },
  {
    tab: 'CONTRACTS', icon: ICONS.receipt, label: 'Hợp đồng', requires: ['VT-05'],
    matches: ['CONTRACT_DETAIL'],
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
  {
    tab: 'REPORTS', icon: ICONS.document, label: 'Báo cáo',
    matches: ['PIPELINE_REPORT', 'REVENUE_REPORT', 'TIMESHEET_REPORT'],
    requires: ['VT-01', 'VT-04', 'VT-05', 'VT-02'],
    // Trung tâm báo cáo: mỗi thẻ báo cáo tự lọc theo vai trò (đường ống: VT-01/VT-04; doanh thu theo
    // tháng NCL-11-CN-005: VT-01/VT-05; giờ công theo nhân sự NCL-11-CN-006: VT-02), trang báo cáo
    // cũng tự chặn vai trò không đúng.
  },
  { tab: 'CUSTOMER_MERGE', icon: ICONS.merge, label: 'Gộp KH trùng', requires: ['VT-07'] },
  {
    tab: 'BILL_RATES', icon: ICONS.money, label: 'Bảng đơn giá', requires: ['VT-05', 'VT-07'],
    // NCL-07-CN-001: khai báo đơn giá theo NGÀY công cho từng (vai trò, cấp bậc),
    // dùng bởi NCL-03-CN-003 (Lập báo giá). Chỉ Kế toán/Quản trị viên thao tác được.
  },
  {
    tab: 'RATE_HISTORY', icon: ICONS.history, label: 'Lịch sử đơn giá', requires: ['VT-05', 'VT-07'],
    // NCL-07-CN-007: toàn bộ các mốc đơn giá đã từng khai báo cho một (vai trò, cấp
    // bậc) — giải thích chênh lệch doanh thu giữa hai kỳ. Tách khỏi "Bảng đơn giá" vì
    // đây là tra cứu độc lập theo cặp cụ thể, không phải quản lý toàn bộ bảng giá.
  },
  {
    tab: 'INVOICES', icon: ICONS.receipt, label: 'Hóa đơn', matches: ['INVOICE_DETAIL'], requires: ['VT-05'],
    // NCL-10-CN-004/006: gộp danh sách/chi tiết hóa đơn + báo cáo tuổi nợ vào MỘT
    // trang (InvoicesPage) — hai thứ này nhìn theo TOÀN CÔNG TY, không gắn 1 hợp
    // đồng cụ thể nên không đưa được vào trang chi tiết hợp đồng. Đề xuất hóa đơn
    // (T&M) và lịch hóa đơn định kỳ (Maintenance) đã chuyển hẳn vào ContractDetailPage
    // (nhúng sẵn, hợp đồng chọn sẵn) — không còn là tab riêng ở đây. Chỉ Kế toán (VT-05).
  },
  {
    tab: 'EXPENSE_APPROVAL', icon: ICONS.money, label: 'Duyệt chi phí dự án', requires: ['VT-05'],
    // NCL-08-CN-002: Kế toán xem hàng chờ duyệt và duyệt/từ chối từng phiếu chi phí dự
    // án (NCL-08-CN-001) trước khi phiếu được tính vào giá vốn dự án.
  },
  {
    tab: 'OVERHEAD_ALLOCATION', icon: ICONS.chart, label: 'Phân bổ chi phí chung', requires: ['VT-05'],
    // NCL-08-CN-005: Kế toán chia tổng chi phí chung phát sinh trong kỳ (tháng) cho các
    // dự án theo tỷ trọng giờ công đã duyệt trong kỳ đó.
  },
  {
    tab: 'MARGIN_BY_CUSTOMER', icon: ICONS.building, label: 'Biên LN theo khách hàng', requires: ['VT-01'],
    // NCL-09-CN-005 (TC-01): gộp doanh thu ghi nhận + giá vốn giờ công đã duyệt theo từng
    // khách hàng trong kỳ. Chỉ Ban giám đốc (VT-01) xem được — khớp @PreAuthorize backend.
  },
  {
    tab: 'MARGIN_BY_EMPLOYEE', icon: ICONS.users, label: 'Biên LN theo nhân sự', requires: ['VT-01'],
    // NCL-09-CN-005 (TC-02): cùng phép tính nhưng gộp theo từng nhân sự thực hiện — nhạy
    // cảm hơn báo cáo theo khách hàng nên cũng chỉ Ban giám đốc (VT-01) xem được.
  },
  {
    tab: 'PROJECT_LABOR_COST', icon: ICONS.money, label: 'Giá vốn giờ công', requires: ['VT-01', 'VT-02', 'VT-05'],
    // NCL-09-CN-001: Tính giá vốn giờ công dự án (số giờ đã duyệt × đơn giá/chi phí giờ).
    // Hiển thị KPI tổng hợp + bảng chi tiết từng dòng. Dữ liệu nhạy cảm (đơn giá, giá vốn)
    // được backend masking; frontend dùng canViewSensitiveData để kiểm soát hiển thị.
    matches: ['PROJECT_LABOR_COST'],
  },
  {
    tab: 'PLANNED_VS_ACTUAL', icon: ICONS.chart, label: 'Biên lợi nhuận dự kiến vs thực tế', requires: ['VT-02'],
    // NCL-09-CN-006: So sánh biên lợi nhuận dự kiến (báo giá) với thực tế (giờ công đã duyệt).
    // Chỉ VT-02 (Quản lý dự án) được xem — khác với labor-cost (VT-01/VT-02/VT-05); response
    // là số liệu tổng hợp cấp dự án nên không che dữ liệu QTN-02.
  },
  {
    tab: 'PROFIT_FORECAST', icon: ICONS.chart, label: 'Dự báo lợi nhuận khi kết thúc', requires: ['VT-02'],
    // NCL-09-CN-007: ngoại suy giá vốn/biên lợi nhuận tới khi dự án kết thúc từ giờ công thực tế và ngân sách giờ
    // (phần giờ còn lại; vượt ngân sách thì theo tốc độ tiêu hao thực tế). Chỉ VT-02 (Quản lý dự án) xem được —
    // khớp @PreAuthorize backend; số liệu tổng hợp cấp dự án nên không che dữ liệu QTN-02.
  },
  {
    tab: 'PROJECT_RECOGNIZED_REVENUE', icon: ICONS.chart, label: 'Doanh thu ghi nhận', requires: ['VT-01', 'VT-05'],
    // NCL-09-CN-002: tính động doanh thu ghi nhận của dự án theo đúng loại hợp đồng
    // (giờ công đã duyệt × đơn giá, hoặc giá trị hợp đồng × tỷ lệ hoàn thành). Chỉ
    // Ban giám đốc (VT-01) và Kế toán (VT-05) xem được — khớp @PreAuthorize backend.
  },
  {
    tab: 'PROJECT_MARGIN', icon: ICONS.chart, label: 'Biên lợi nhuận', requires: ['VT-01', 'VT-02', 'VT-05'],
    // NCL-09-CN-003: biên lợi nhuận gộp thời gian thực của dự án (doanh thu ghi nhận
    // trừ toàn bộ chi phí đã duyệt). Chỉ dữ liệu chi phí từng dòng (hourlyRate/laborCost)
    // bị che với VT-02 theo QTN-02 — số tổng hợp hiển thị cho cả ba vai trò.
  },
  {
    tab: 'MARGIN_ALERT_THRESHOLD', icon: ICONS.alertTriangle, label: 'Ngưỡng cảnh báo âm biên',
    requires: ['VT-01', 'VT-02', 'VT-05'],
    // NCL-09-CN-004: ngưỡng biên lợi nhuận tối thiểu toàn công ty — vượt ngưỡng thì hệ
    // thống tự gửi thông báo cho quản lý dự án + Ban giám đốc mỗi khi tính lại biên lợi
    // nhuận (NCL-09-CN-003). Chỉ Ban giám đốc (VT-01) được đặt/đổi (TC-03); VT-02/VT-05
    // chỉ xem được ngưỡng hiện hành.
  },
  {
    tab: 'REPORT_EXPORT', icon: ICONS.download, label: 'Xuất báo cáo', requires: ['VT-02'],
    // NCL-11-CN-004: Quản lý dự án chọn báo cáo + kỳ rồi xuất tệp bảng tính. Backend
    // tự bỏ cột giá vốn theo quyền người xuất (QTN-02) và ghi nhật ký mỗi lần xuất.
  },
  { tab: 'OPPORTUNITY_DETAIL', icon: ICONS.building, label: 'Cơ hội', requires: ['VT-04'] },
];

/** Quản trị & Tổ chức — cơ cấu tổ chức, tài khoản, nhân sự, phân quyền. Tách
 * khỏi nhóm Kinh doanh vì đây là công việc quản trị nội bộ (VT-07/VT-06), không
 * phải nghiệp vụ bán hàng hàng ngày. */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { tab: 'DEPARTMENTS', icon: ICONS.tree, label: 'Tổ chức', requires: ['VT-07'] },
  { tab: 'USERS', icon: ICONS.user, label: 'Tài khoản', matches: ['DETAIL'], requires: ['VT-07'] },
  { tab: 'EMPLOYEES', icon: ICONS.users, label: 'Nhân sự', matches: ['EMPLOYEE_DETAIL'], requires: ['VT-06', 'VT-07'] },
  { tab: 'PERMISSIONS', icon: ICONS.shield, label: 'Phân quyền', requires: ['VT-07'] },
];

/** Bảo mật & Hệ thống — nhóm riêng, tách khỏi điều hướng nghiệp vụ hàng ngày (theo
 * mẫu "Favorites" của tham chiếu: một nhãn xám nhỏ đứng trên nhóm mục phụ). */
export const SYSTEM_NAV_ITEMS: NavItem[] = [
  { tab: 'TWO_FACTOR_SETTINGS', icon: ICONS.key, label: '2FA', requires: ['VT-07'] },
  { tab: 'SYSTEM_AUDIT_LOG', icon: ICONS.history, label: 'Nhật ký hệ thống', requires: ['VT-07'] },
  { tab: 'AUDIT_LOG', icon: ICONS.shieldOff, label: 'Dữ liệu nhạy cảm', requires: ['VT-07'] },
];

/** Tất cả nhóm điều hướng, theo thứ tự hiển thị trên sidebar. */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'timesheet', label: null, paletteLabel: 'Chấm công', items: TIMESHEET_NAV_ITEMS },
  { id: 'business', label: 'Kinh doanh', paletteLabel: 'Kinh doanh', items: BUSINESS_NAV_ITEMS },
  { id: 'admin', label: 'Quản trị & Tổ chức', paletteLabel: 'Quản trị & Tổ chức', items: ADMIN_NAV_ITEMS },
  { id: 'security', label: 'Bảo mật & Hệ thống', paletteLabel: 'Bảo mật & Hệ thống', items: SYSTEM_NAV_ITEMS },
];

/** Tất cả mục điều hướng (theo thứ tự nhóm). */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * Quyền truy cập thực sự nằng ở backend + từng trang. Hàm này CHỈ dùng để quyết
 * định hiển thị trên giao diện (sidebar / bảng lệnh).
 */
export function canAccess(item: NavItem, roles: readonly string[] = []): boolean {
  return !item.requires || item.requires.some((role) => roles.includes(role));
}

/**
 * Mục hiển thị khi người dùng có đủ vai trò (full quyền), HOẶC khi mục mang
 * `viewOnlyHint` (trang cho phép xem nhưng không thao tác — người dùng vẫn tương
 * tác được). Các mục bị khóa hoàn toàn (không quyền + không viewOnly) sẽ bị ẨN
 * khỏi thanh điều hướng thay vì hiển thị mờ + icon khóa như trước đây — tránh
 * làm rối thanh bằng chức năng người dùng chưa từng thao tác tới.
 */
export function isItemVisible(item: NavItem, roles: readonly string[] = []): boolean {
  return canAccess(item, roles) || Boolean(item.viewOnlyHint);
}

/** Tất cả mục điều hướng hiển thị với vai trò hiện tại, theo thứ tự nhóm. */
export function visibleNavItems(roles: readonly string[] = []): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => isItemVisible(item, roles));
}

/** Các nhóm có ít nhất một mục hiển thị, kèm danh sách mục hiển thị của nhóm.
 * Nhóm không mục nào hiển thị (ví dụ "Bảo mật & Hệ thống" với người không phải
 * quản trị viên) sẽ bị bỏ qua — không vẽ nhãn nhóm trống. */
export function navGroupsFor(roles: readonly string[] = []): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isItemVisible(item, roles)),
  })).filter((group) => group.items.length > 0);
}

/**
 * Tab mặc định khi đăng nhập hoặc vai trò thay đổi: giữ nguyên "Tổ chức"
 * (DEPARTMENTS) cho quản trị viên (đã thấy trang này), còn lại chọn mục hiển
 * thị đầu tiên — luôn là "Công việc và giờ công" vì mục này không yêu cầu
 * vai trò nào. Tránh đưa người không được phép vào "Tổ chức" rồi báo ngay
 * "Không có thẩm quyền".
 */
export function defaultTabFor(roles: readonly string[] = []): Tab {
  const visible = visibleNavItems(roles);
  if (visible.some((item) => item.tab === 'DEPARTMENTS')) return 'DEPARTMENTS';
  return visible[0]?.tab ?? 'MY_WORK';
}

/**
 * Tab có nên hiện trong thanh điều hướng/bảng lệnh hay không. Dùng để tuần tự
 * hóa lại tab khi vai trò thay đổi (ví dụ: bị thu hẹp quyền) tránh dừng ở trang
 * "Không có thẩm quyền".
 */
export function isTabVisible(tab: Tab, roles: readonly string[] = []): boolean {
  // Hai mục tính luôn truy cập được qua menu tài khoản, không nằm trong NAV_ITEMS.
  if (tab === 'CHANGE_PASSWORD' || tab === 'NOTIFICATIONS') return true;
  const direct = ALL_NAV_ITEMS.find((item) => item.tab === tab);
  if (direct) return isItemVisible(direct, roles);
  // Tab con (chi tiết KH, nhân viên, báo cáo đường ống) — dựa trên mục cha.
  const parent = ALL_NAV_ITEMS.find((item) => (item.matches ?? []).includes(tab));
  return parent ? isItemVisible(parent, roles) : true;
}
