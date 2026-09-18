import { describe, it, expect } from 'vitest';
import {
  ALL_NAV_ITEMS,
  NAV_GROUPS,
  canAccess,
  isItemVisible,
  visibleNavItems,
  navGroupsFor,
  defaultTabFor,
  isTabVisible,
} from '../menuConfig';

/** Rút gọn: danh sách `tab` hiển thị với một bộ vai trò. */
const tabsFor = (roles: readonly string[]) => visibleNavItems(roles).map((i) => i.tab);

describe('canAccess — quy tắc phân quyền hiển thị', () => {
  it('mục không yêu cầu vai trò nào luôn truy cập được (ví dụ: Công việc và giờ công)', () => {
    const myWork = ALL_NAV_ITEMS.find((i) => i.tab === 'MY_WORK')!;
    expect(canAccess(myWork, [])).toBe(true);
    expect(canAccess(myWork, ['VT-03'])).toBe(true);
    expect(canAccess(myWork, ['VT-09'])).toBe(true);
  });

  it('mục yêu cầu vai trò thì chỉ người có vai trò đó được phép', () => {
    const permissions = ALL_NAV_ITEMS.find((i) => i.tab === 'PERMISSIONS')!;
    expect(canAccess(permissions, ['VT-07'])).toBe(true);
    expect(canAccess(permissions, ['VT-02'])).toBe(false);
    expect(canAccess(permissions, [])).toBe(false);
  });

  it('cho phép khi tài khoản có ít nhất một trong các vai trò yêu cầu', () => {
    const unsubmitted = ALL_NAV_ITEMS.find((i) => i.tab === 'UNSUBMITTED_TIMESHEETS')!;
    expect(canAccess(unsubmitted, ['VT-02'])).toBe(true);
    expect(canAccess(unsubmitted, ['VT-03'])).toBe(true);
    expect(canAccess(unsubmitted, ['VT-02', 'VT-05'])).toBe(true);
    expect(canAccess(unsubmitted, ['VT-05'])).toBe(false);
  });
});

describe('isItemVisible — sidebar chỉ hiện thị chức năng người dùng thấy được', () => {
  it('ẩn mục chặn hẳn (không quyền, không viewOnly) thay vì hiển thị mờ + icon khóa', () => {
    const departments = ALL_NAV_ITEMS.find((i) => i.tab === 'DEPARTMENTS')!;
    expect(isItemVisible(departments, ['VT-02'])).toBe(false); // quản lý dự án thấy không Tổ chức
    expect(isItemVisible(departments, ['VT-07'])).toBe(true); // quản trị viên thấy
  });

  it('vẫn hiện mục "chỉ xem" (viewOnlyHint) — người dùng vẫn tương tác bằng cách xem', () => {
    const opportunities = ALL_NAV_ITEMS.find((i) => i.tab === 'OPPORTUNITIES')!;
    expect(isItemVisible(opportunities, ['VT-01'])).toBe(true); // full quyền
    expect(isItemVisible(opportunities, ['VT-03'])).toBe(true); // chỉ xem
    expect(isItemVisible(opportunities, ['VT-08'])).toBe(true); // chỉ xem
    expect(isItemVisible(opportunities, [])).toBe(true); // chỉ xem (mọi vai trò đều xem pipeline)
  });
});

describe('visibleNavItems — thanh sidebar theo vai trò', () => {
  it('Quản lý dự án (VT-02) thấy đúng chức năng mình thao tác', () => {
    expect(tabsFor(['VT-02'])).toEqual([
      'MY_WORK',
      'TIMESHEET_APPROVAL',
      'TIMESHEET_REJECT',
      'TIMESHEET_ADJUSTMENT',
      'UNSUBMITTED_TIMESHEETS',
      'CUSTOMERS',
      'OPPORTUNITIES',
    ]);
  });

  it('Quản lý dự án (VT-02) KHÔNG thấy các mục quản trị / bảo mật', () => {
    const visible = tabsFor(['VT-02']);
    expect(visible).not.toContain('DEPARTMENTS');
    expect(visible).not.toContain('USERS');
    expect(visible).not.toContain('USERS');
    expect(visible).not.toContain('PERMISSIONS');
    expect(visible).not.toContain('TWO_FACTOR_SETTINGS');
    expect(visible).not.toContain('AUDIT_LOG');
    expect(visible).not.toContain('SYSTEM_AUDIT_LOG');
    expect(visible).not.toContain('CONTRACTS');
    expect(visible).not.toContain('BILL_RATES');
  });

  it('Kế toán (VT-05) thấy chấm công + hợp đồng + đơn giá (và Cơ hộp chỉ xem)', () => {
    expect(tabsFor(['VT-05'])).toEqual([
      'MY_WORK',
      'TIMESHEET_PERIOD',
      'CONTRACTS',
      'OPPORTUNITIES',
      'BILL_RATES',
      'RATE_HISTORY',
      'EXPENSE_APPROVAL',
      'OVERHEAD_ALLOCATION',
    ]);
  });

  it('Nhân sự (VT-06) thấy chấm công + nhân sự', () => {
    expect(tabsFor(['VT-06'])).toEqual(['MY_WORK', 'OPPORTUNITIES', 'EMPLOYEES']);
  });

  it('Nhân viên kinh doanh (VT-04) thấy trang trai của Kinh doanh', () => {
    expect(tabsFor(['VT-04'])).toEqual([
      'MY_WORK',
      'CUSTOMERS',
      'OPPORTUNITIES',
      'REVENUE_FORECAST',
      'REPORTS',
      'OPPORTUNITY_DETAIL',
    ]);
  });

  it('Quản trị viên (VT-07) chỉ thấy mục quản trị + mục dùng chung, không tham gia nghiệp vụ bán hàng/dự án/kế toán', () => {
    // Đúng theo vai trò VT-07 trong tài liệu backlog: "Không tham gia nghiệp vụ
    // bán hàng, dự án hay kế toán" — nên KHÔNG thấy Khách hàng, Hợp đồng, Duyệt
    // bảng chấm công... dù có toàn quyền quản trị hệ thống.
    expect(tabsFor(['VT-07'])).toEqual([
      'MY_WORK',
      'OPPORTUNITIES',
      'CUSTOMER_MERGE',
      'BILL_RATES',
      'RATE_HISTORY',
      'DEPARTMENTS',
      'USERS',
      'EMPLOYEES',
      'PERMISSIONS',
      'TWO_FACTOR_SETTINGS',
      'SYSTEM_AUDIT_LOG',
      'AUDIT_LOG',
    ]);
  });

  it('Nhân viên công ty (VT-08) chỉ thấy Công việc + Cơ hộp (chỉ xem)', () => {
    expect(tabsFor(['VT-08'])).toEqual(['MY_WORK', 'OPPORTUNITIES']);
  });

  it('Khách hàng (VT-09) chỉ thấy Công việc + Cơ hộp (chỉ xem)', () => {
    expect(tabsFor(['VT-09'])).toEqual(['MY_WORK', 'OPPORTUNITIES']);
  });

  it('Tài khoản không vai trò nào vẫn thấy Công việc + Cơ hộp (chỉ xem)', () => {
    expect(tabsFor([])).toEqual(['MY_WORK', 'OPPORTUNITIES']);
  });
});

describe('navGroupsFor — bỏ qua nhóm không có mục hiển thị', () => {
  it('VT-08 chỉ còn 2 nhóm (Chấm công + Kinh doanh), các nhóm Quản trị/Bảo mật biến mất', () => {
    const groups = navGroupsFor(['VT-08']);
    expect(groups.map((g) => g.paletteLabel)).toEqual(['Chấm công', 'Kinh doanh']);
    expect(groups[0].items.map((i) => i.tab)).toEqual(['MY_WORK']);
    expect(groups[1].items.map((i) => i.tab)).toEqual(['OPPORTUNITIES']);
  });

  it('VT-05 giữ nhóm Chấm công + Kinh doanh nhưng bỏ Quản trị/Bảo mật', () => {
    const groups = navGroupsFor(['VT-05']);
    expect(groups.map((g) => g.paletteLabel)).toEqual(['Chấm công', 'Kinh doanh']);
    expect(groups[0].items.map((i) => i.tab)).toEqual(['MY_WORK', 'TIMESHEET_PERIOD']);
    expect(groups[1].items.map((i) => i.tab)).toEqual([
      'CONTRACTS',
      'OPPORTUNITIES',
      'BILL_RATES',
      'RATE_HISTORY',
      'EXPENSE_APPROVAL',
      'OVERHEAD_ALLOCATION',
    ]);
  });

  it('VT-07 (quản trị) giữ đủ 4 nhóm theo đúng thứ tự', () => {
    expect(navGroupsFor(['VT-07']).map((g) => g.paletteLabel)).toEqual([
      'Chấm công',
      'Kinh doanh',
      'Quản trị & Tổ chức',
      'Bảo mật & Hệ thống',
    ]);
  });

  it('luôn duy trì đúng thứ tự nhóm (Chấm công trước)', () => {
    expect(NAV_GROUPS.map((g) => g.paletteLabel)).toEqual([
      'Chấm công',
      'Kinh doanh',
      'Quản trị & Tổ chức',
      'Bảo mật & Hệ thống',
    ]);
  });
});

describe('defaultTabFor — đưa người dùng tới mục họ thấy được', () => {
  it('quản trị viên (VT-07) vẫn đặt mặc định ở Tổ chức (giữ hành vi cũ)', () => {
    expect(defaultTabFor(['VT-07'])).toBe('DEPARTMENTS');
  });

  it('các vai trò khác không thấy Tổ chức nên quay về Công việc và giờ công', () => {
    expect(defaultTabFor(['VT-01'])).toBe('MY_WORK');
    expect(defaultTabFor(['VT-02'])).toBe('MY_WORK');
    expect(defaultTabFor(['VT-05'])).toBe('MY_WORK');
    expect(defaultTabFor(['VT-06'])).toBe('MY_WORK');
    expect(defaultTabFor(['VT-08'])).toBe('MY_WORK');
    expect(defaultTabFor([])).toBe('MY_WORK');
  });
});

describe('isTabVisible — tuần tự hóa lại khi vai trỏ đổi', () => {
  it('mục tính (Đổi mật khẩu, Thông báo) luôn hiển thị qua menu tài khoản', () => {
    expect(isTabVisible('CHANGE_PASSWORD', [])).toBe(true);
    expect(isTabVisible('NOTIFICATIONS', [])).toBe(true);
    expect(isTabVisible('CHANGE_PASSWORD', ['VT-03'])).toBe(true);
  });

  it('tab con hiển thị khi mục cha hiển thị', () => {
    expect(isTabVisible('PIPELINE_REPORT', ['VT-01'])).toBe(true); // cha: Báo cáo
    expect(isTabVisible('DETAIL', ['VT-07'])).toBe(true); // cha: Tài khoản
    expect(isTabVisible('EMPLOYEE_DETAIL', ['VT-06'])).toBe(true); // cha: Nhân sự
  });

  it('tab con ẩn khi mục cha bị khóa', () => {
    expect(isTabVisible('PIPELINE_REPORT', ['VT-02'])).toBe(false); // cha: Báo cáo bị khóa
    expect(isTabVisible('DETAIL', ['VT-02'])).toBe(false); // cha: Tài khoản (VT-07)
    expect(isTabVisible('DEPARTMENTS', ['VT-02'])).toBe(false);
  });

  it('chặn hẳn mục vào trang này', () => {
    expect(isTabVisible('DEPARTMENTS', ['VT-07'])).toBe(true);
    expect(isTabVisible('PERMISSIONS', ['VT-05'])).toBe(false);
    expect(isTabVisible('OPPORTUNITIES', ['VT-02'])).toBe(true); // VT-02 có full quyền
  });
});
