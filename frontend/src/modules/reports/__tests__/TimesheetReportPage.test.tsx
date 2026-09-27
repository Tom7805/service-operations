import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TimesheetReportPage from '../pages/TimesheetReportPage';
import type { TimesheetByEmployeeRes } from '../types/reportTypes';

/** Node >= 25 có localStorage thử nghiệm che mất bản của jsdom (undefined) — dùng bộ nhớ tạm riêng cho ổn định. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

function report(hasRows: boolean): TimesheetByEmployeeRes {
  return {
    from: '2026-09-01',
    to: '2026-09-24',
    employeeCount: hasRows ? 2 : 0,
    projectCount: hasRows ? 1 : 0,
    totalBillableHours: hasRows ? 120 : 0,
    totalNonBillableHours: hasRows ? 8 : 0,
    totalHours: hasRows ? 128 : 0,
    rows: hasRows
      ? [
          {
            employeeId: 11,
            employeeName: 'Nguyen Van A',
            projectId: 1,
            projectCode: 'DA-01',
            projectName: 'Trien khai ERP',
            billableHours: 100,
            nonBillableHours: 4,
            totalHours: 104,
          },
          // Tài khoản chưa có hồ sơ nhân sự — employeeId/employeeName null nhưng vẫn phải hiện dòng.
          {
            employeeId: null,
            employeeName: null,
            projectId: 1,
            projectCode: 'DA-01',
            projectName: 'Trien khai ERP',
            billableHours: 20,
            nonBillableHours: 4,
            totalHours: 24,
          },
        ]
      : [],
  };
}

function respondWith(body: TimesheetByEmployeeRes) {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: body }), { status: 200 }));
}

describe('TimesheetReportPage (NCL-11-CN-006)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('sessionStorage', memoryStorage());
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TC-01: hiện đủ KPI tổng hợp và bảng lưới người × dự án, tách giờ có/không tính phí', async () => {
    respondWith(report(true));
    render(<TimesheetReportPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('timesheet-total-billable')).toHaveTextContent('120,00');
    const table = screen.getByTestId('timesheet-table');
    expect(table).toHaveTextContent('Nguyen Van A');
    expect(table).toHaveTextContent('DA-01');
    expect(table).toHaveTextContent('104,00');
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/reports/timesheet?from=');
  });

  it('tài khoản chưa có hồ sơ nhân sự vẫn hiện dòng, tên trống thay vì mất dữ liệu', async () => {
    respondWith(report(true));
    render(<TimesheetReportPage currentUserRoles={['VT-02']} />);

    const table = await screen.findByTestId('timesheet-table');
    expect(table).toHaveTextContent('—');
  });

  it('TC-02: kỳ không có giờ công đã duyệt hiện trạng thái rỗng, không có bảng', async () => {
    respondWith(report(false));
    render(<TimesheetReportPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('timesheet-empty')).toHaveTextContent('Không có giờ công đã duyệt');
    expect(screen.queryByTestId('timesheet-table')).toBeNull();
  });

  it('TC-03: vai trò khác không gọi backend và thấy thông báo không có quyền', () => {
    render(<TimesheetReportPage currentUserRoles={['VT-01']} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Chỉ Quản lý dự án');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('chặn ngày kết thúc trước ngày bắt đầu', async () => {
    respondWith(report(true));
    render(<TimesheetReportPage currentUserRoles={['VT-02']} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-09-24' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem báo cáo' }));

    expect(await screen.findByText('Ngày kết thúc không được trước ngày bắt đầu.')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
