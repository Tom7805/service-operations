import { describe, it, expect } from 'vitest';
import {
  ALL_NAV_ITEMS,
  ALL_NAV_LEAVES,
  NAV_GROUPS,
  accountLeavesFor,
  canAccess,
  defaultTabFor,
  entryTabOf,
  findNavItem,
  isItemVisible,
  isTabVisible,
  navGroupsFor,
  visibleNavLeaves,
} from '../menuConfig';

/** Rút gọn: các màn hình người dùng thấy được, theo thứ tự sidebar. */
const tabsFor = (roles: readonly string[]) => visibleNavLeaves(roles).map((leaf) => leaf.tab);
/** Rút gọn: các mục sidebar (id) người dùng thấy được. */
const itemsFor = (roles: readonly string[]) => navGroupsFor(roles).flatMap((g) => g.items.map((i) => i.id));
const leaf = (tab: string) => ALL_NAV_LEAVES.find((l) => l.tab === tab)!;

describe('canAccess — quy tắc phân quyền hiển thị', () => {
  it('màn hình không yêu cầu vai trò luôn truy cập được (Việc của tôi)', () => {
    expect(canAccess(leaf('MY_WORK'), [])).toBe(true);
    expect(canAccess(leaf('MY_WORK'), ['VT-03'])).toBe(true);
  });

  it('màn hình yêu cầu vai trò thì chỉ người có vai trò đó được phép', () => {
    expect(canAccess(leaf('PERMISSIONS'), ['VT-07'])).toBe(true);
    expect(canAccess(leaf('PERMISSIONS'), ['VT-02'])).toBe(false);
    expect(canAccess(leaf('UNSUBMITTED_TIMESHEETS'), ['VT-02', 'VT-05'])).toBe(true);
    expect(canAccess(leaf('UNSUBMITTED_TIMESHEETS'), ['VT-03'])).toBe(false);
  });
});

describe('khu làm việc — một mục sidebar, nhiều tab', () => {
  it('mục hiện nếu người dùng thấy ít nhất một tab, mở vào tab đầu tiên họ thấy', () => {
    const profit = ALL_NAV_ITEMS.find((i) => i.id === 'profitability')!;
    expect(isItemVisible(profit, ['VT-03'])).toBe(false);
    expect(entryTabOf(profit, ['VT-02'])).toBe('PROJECT_MARGIN');
    const settings = ALL_NAV_ITEMS.find((i) => i.id === 'settings')!;
    // "Cài đặt" chỉ còn những thứ chỉnh được — Kế toán không có gì để chỉnh nên không thấy mục này.
    expect(isItemVisible(settings, ['VT-05'])).toBe(false);
    expect(entryTabOf(settings, ['VT-07'])).toBe('COMPANY_SETTINGS');
  });

  it('tab chỉ dành cho một vai trò không lộ ra với vai trò khác trong cùng khu làm việc', () => {
    const profitTabs = (roles: string[]) =>
      navGroupsFor(roles).flatMap((g) => g.items).find((i) => i.id === 'profitability')?.tabs?.map((t) => t.tab);
    expect(profitTabs(['VT-02'])).toEqual([
      'PROJECT_MARGIN', 'PROJECT_LABOR_COST', 'PLANNED_VS_ACTUAL', 'PROFIT_FORECAST', 'MARGIN_ALERT_THRESHOLD',
    ]);
    expect(profitTabs(['VT-05'])).toEqual([
      'PROJECT_MARGIN', 'PROJECT_LABOR_COST', 'PROJECT_RECOGNIZED_REVENUE', 'MARGIN_ALERT_THRESHOLD',
    ]);
  });

  it('findNavItem tìm đúng mục cho tab khu làm việc và màn hình chi tiết', () => {
    expect(findNavItem('OVERHEAD_ALLOCATION')?.id).toBe('expenses');
    expect(findNavItem('ACCEPTANCE_DETAIL')?.id).toBe('acceptance');
    expect(findNavItem('CONTRACT_DETAIL')?.id).toBe('contracts');
    expect(findNavItem('PIPELINE_REPORT')?.id).toBe('reports');
  });
});

describe('sidebar theo vai trò — gọn hơn nhưng không mất màn hình nào', () => {
  it('Quản lý dự án (VT-02): 8 mục, "Dự án" ngay dưới "Việc của tôi"', () => {
    expect(itemsFor(['VT-02'])).toEqual([
      'my-work', 'projects', 'timesheet-review', 'customers', 'opportunities', 'acceptance', 'profitability', 'reports',
    ]);
    expect(tabsFor(['VT-02'])).toEqual([
      'MY_WORK',
      'PROJECTS',
      'TIMESHEET_APPROVAL', 'UNSUBMITTED_TIMESHEETS', 'TIMESHEET_ADJUSTMENT',
      'CUSTOMERS', 'OPPORTUNITIES',
      'ACCEPTANCES', 'DELIVERABLES',
      'PROJECT_MARGIN', 'PROJECT_LABOR_COST', 'PLANNED_VS_ACTUAL', 'PROFIT_FORECAST', 'MARGIN_ALERT_THRESHOLD',
      'REPORTS',
    ]);
  });

  it('Kế toán (VT-05): hợp đồng và hóa đơn vẫn là hai mục riêng', () => {
    expect(itemsFor(['VT-05'])).toEqual([
      'my-work', 'projects', 'contracts', 'invoices', 'expenses', 'timesheet-period', 'profitability', 'rates', 'reports',
    ]);
  });

  it('Nhân viên kinh doanh (VT-04): 4 mục', () => {
    expect(itemsFor(['VT-04'])).toEqual(['my-work', 'customers', 'opportunities', 'reports']);
  });

  it('Nhân sự (VT-06) thấy Nhân sự; không còn mục Cài đặt chỉ để đọc', () => {
    expect(itemsFor(['VT-06'])).toEqual(['my-work', 'employees']);
    expect(tabsFor(['VT-06'])).toEqual(['MY_WORK', 'EMPLOYEES']);
  });

  it('"Quyền xem dữ liệu" mở từ menu tài khoản, chỉ cho Ban giám đốc / Kế toán / Nhân sự (QTN-02)', () => {
    for (const role of ['VT-01', 'VT-05', 'VT-06']) {
      expect(accountLeavesFor([role]).map((l) => l.tab)).toEqual(['MASKING_RULES']);
      expect(isTabVisible('MASKING_RULES', [role])).toBe(true);
    }
    for (const role of ['VT-02', 'VT-03', 'VT-04', 'VT-07']) {
      expect(accountLeavesFor([role])).toEqual([]);
      expect(isTabVisible('MASKING_RULES', [role])).toBe(false);
    }
    // Không còn nằm trên sidebar ở bất kỳ vai trò nào.
    expect(findNavItem('MASKING_RULES')).toBeUndefined();
  });

  it('"Dự án": Ban giám đốc, Quản lý dự án, Kế toán thấy; trang chi tiết/rủi ro thuộc cùng mục', () => {
    const projects = ALL_NAV_ITEMS.find((i) => i.id === 'projects')!;
    for (const role of ['VT-01', 'VT-02', 'VT-05']) expect(isItemVisible(projects, [role])).toBe(true);
    for (const role of ['VT-03', 'VT-04', 'VT-06', 'VT-07']) expect(isItemVisible(projects, [role])).toBe(false);
    expect(findNavItem('PROJECT_DETAIL')?.id).toBe('projects');
    expect(findNavItem('PROJECT_RISKS')?.id).toBe('projects');
  });

  it('Quản trị viên (VT-07) không tham gia nghiệp vụ bán hàng / dự án / kế toán', () => {
    expect(itemsFor(['VT-07'])).toEqual([
      'my-work', 'rates', 'departments', 'accounts', 'employees', 'service-catalog', 'data', 'logs', 'settings',
    ]);
    const visible = tabsFor(['VT-07']);
    for (const tab of ['CUSTOMERS', 'CONTRACTS', 'INVOICES', 'TIMESHEET_APPROVAL', 'PROJECT_MARGIN', 'REPORTS']) {
      expect(visible).not.toContain(tab);
    }
    expect(visible).toContain('DATA_IMPORT');
  });

  it('Quản lý dự án KHÔNG thấy màn hình quản trị / bảo mật / kế toán', () => {
    const visible = tabsFor(['VT-02']);
    for (const tab of ['DEPARTMENTS', 'USERS', 'PERMISSIONS', 'TWO_FACTOR_SETTINGS', 'AUDIT_LOG',
      'SYSTEM_AUDIT_LOG', 'CONTRACTS', 'BILL_RATES', 'DATA_IMPORT', 'BACKUP_RESTORE']) {
      expect(visible).not.toContain(tab);
    }
  });

  it('Cơ hội chỉ hiện với vai trò backend cho phép (VT-01/VT-02/VT-04)', () => {
    const opp = ALL_NAV_ITEMS.find((i) => i.id === 'opportunities')!;
    for (const role of ['VT-01', 'VT-02', 'VT-04']) expect(isItemVisible(opp, [role])).toBe(true);
    for (const role of ['VT-03', 'VT-05', 'VT-06', 'VT-07', 'VT-09']) expect(isItemVisible(opp, [role])).toBe(false);
  });

  it('nhân viên / tài khoản không vai trò chỉ thấy Việc của tôi', () => {
    expect(tabsFor(['VT-03'])).toEqual(['MY_WORK']);
    expect(tabsFor(['VT-08'])).toEqual(['MY_WORK']);
    expect(tabsFor([])).toEqual(['MY_WORK']);
  });
});

describe('cấu trúc nhóm', () => {
  it('thứ tự nhóm cố định', () => {
    expect(NAV_GROUPS.map((g) => g.id)).toEqual(['work', 'business', 'finance', 'reports', 'admin']);
  });

  it('bỏ qua nhóm không có mục hiển thị', () => {
    expect(navGroupsFor(['VT-03']).map((g) => g.id)).toEqual(['work']);
  });

  it('mỗi mục sidebar dùng một icon riêng', () => {
    const icons = ALL_NAV_ITEMS.map((i) => i.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('không màn hình nào nằm ở hai mục sidebar cùng lúc', () => {
    const tabs = ALL_NAV_LEAVES.map((l) => l.tab);
    expect(new Set(tabs).size).toBe(tabs.length);
  });
});

describe('defaultTabFor', () => {
  it('Quản trị viên vào Tổ chức; vai trò khác vào Việc của tôi', () => {
    expect(defaultTabFor(['VT-07'])).toBe('DEPARTMENTS');
    for (const roles of [['VT-01'], ['VT-02'], ['VT-05'], ['VT-06'], []]) {
      expect(defaultTabFor(roles)).toBe('MY_WORK');
    }
  });
});

describe('isTabVisible — khi vai trò đổi', () => {
  it('màn hình tài khoản của tôi luôn mở được', () => {
    for (const tab of ['CHANGE_PASSWORD', 'NOTIFICATIONS', 'NOTIFICATION_PREFERENCES'] as const) {
      expect(isTabVisible(tab, [])).toBe(true);
    }
  });

  it('màn hình quản trị chỉ hiện với Quản trị viên', () => {
    expect(isTabVisible('NOTIFICATION_DEDUP', ['VT-07'])).toBe(true);
    expect(isTabVisible('NOTIFICATION_DEDUP', ['VT-02'])).toBe(false);
    expect(isTabVisible('SERVICE_CATALOG', ['VT-04'])).toBe(false);
    expect(isTabVisible('COMPANY_SETTINGS', ['VT-05'])).toBe(false);
    expect(isTabVisible('BACKUP_RESTORE', ['VT-01'])).toBe(false);
    expect(isTabVisible('DATA_IMPORT', ['VT-07'])).toBe(true);
    expect(isTabVisible('DATA_IMPORT', ['VT-05'])).toBe(false);
  });

  it('Kỳ tài chính: người xem báo cáo, và Quản trị viên (mở từ Cài đặt › Công ty)', () => {
    expect(isTabVisible('FISCAL_PERIODS', ['VT-05'])).toBe(true);
    expect(isTabVisible('FISCAL_PERIODS', ['VT-07'])).toBe(true);
    expect(isTabVisible('FISCAL_PERIODS', ['VT-03'])).toBe(false);
  });

  it('màn hình con theo mục cha', () => {
    expect(isTabVisible('PIPELINE_REPORT', ['VT-01'])).toBe(true);
    expect(isTabVisible('PIPELINE_REPORT', ['VT-07'])).toBe(false);
    expect(isTabVisible('DETAIL', ['VT-07'])).toBe(true);
    expect(isTabVisible('DETAIL', ['VT-02'])).toBe(false);
    expect(isTabVisible('EMPLOYEE_DETAIL', ['VT-06'])).toBe(true);
    expect(isTabVisible('ACCEPTANCE_DETAIL', ['VT-02'])).toBe(true);
  });
});
