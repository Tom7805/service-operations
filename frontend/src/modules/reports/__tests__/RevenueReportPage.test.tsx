import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RevenueReportPage from '../pages/RevenueReportPage';
import type { MonthlyRevenueReportRes } from '../types/reportTypes';

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

const byType = (tm: number, fp = 0) => ({ TIME_AND_MATERIAL: tm, FIXED_PRICE: fp, MAINTENANCE: 0, MILESTONE: 0 });

function report(hasData: boolean): MonthlyRevenueReportRes {
  return {
    fromMonth: '2026-01',
    toMonth: '2026-02',
    hasData,
    totalRevenue: hasData ? 23000000 : 0,
    totalByContractType: byType(hasData ? 18000000 : 0, hasData ? 5000000 : 0),
    previousYearTotalRevenue: hasData ? 12000000 : 0,
    totalChangePercent: hasData ? 91.67 : null,
    months: [
      { month: '2026-01', revenue: hasData ? 15000000 : 0, byContractType: byType(hasData ? 10000000 : 0, hasData ? 5000000 : 0),
        previousYearRevenue: hasData ? 12000000 : 0, changePercent: hasData ? 25 : null },
      { month: '2026-02', revenue: hasData ? 8000000 : 0, byContractType: byType(hasData ? 8000000 : 0),
        previousYearRevenue: 0, changePercent: null },
    ],
    missingRevenueEntryCount: 0,
    warnings: [],
  };
}

function respondWith(body: MonthlyRevenueReportRes) {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true, data: body }), { status: 200 }));
}

describe('RevenueReportPage (NCL-11-CN-005)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('sessionStorage', memoryStorage());
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('TC-01: hiện tổng kỳ, một cột mỗi tháng và bảng số liệu theo loại hợp đồng', async () => {
    respondWith(report(true));
    render(<RevenueReportPage currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('revenue-total')).toHaveTextContent('23.000.000');
    expect(screen.getAllByTestId('revenue-bar')).toHaveLength(2);
    expect(screen.getByTestId('revenue-table')).toHaveTextContent('T1/2026');
    expect(screen.getByTestId('revenue-table')).toHaveTextContent('+25%');
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/reports/revenue/monthly?fromMonth=');
  });

  it('rê chuột vào cột hiện chi tiết tháng', async () => {
    respondWith(report(true));
    render(<RevenueReportPage currentUserRoles={['VT-05']} />);

    const bars = await screen.findAllByTestId('revenue-bar');
    fireEvent.mouseEnter(bars[0]);

    expect(screen.getByTestId('revenue-tooltip')).toHaveTextContent('Trọn gói');
    expect(screen.getByTestId('revenue-tooltip')).toHaveTextContent('15.000.000');
  });

  it('TC-02: kỳ không có doanh thu hiện trạng thái rỗng, không có biểu đồ', async () => {
    respondWith(report(false));
    render(<RevenueReportPage currentUserRoles={['VT-01']} />);

    expect(await screen.findByTestId('revenue-empty')).toHaveTextContent('Không có dữ liệu doanh thu');
    expect(screen.queryByTestId('revenue-bar')).toBeNull();
  });

  it('TC-03: vai trò khác không gọi backend và thấy thông báo không có quyền', () => {
    render(<RevenueReportPage currentUserRoles={['VT-02']} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Chỉ Ban giám đốc hoặc Kế toán');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('chặn tháng kết thúc trước tháng bắt đầu', async () => {
    respondWith(report(true));
    render(<RevenueReportPage currentUserRoles={['VT-01']} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('Từ tháng'), { target: { value: '2026-12' } });
    fireEvent.change(screen.getByLabelText('Đến tháng'), { target: { value: '2026-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem báo cáo' }));

    expect(await screen.findByText('Tháng kết thúc không được trước tháng bắt đầu.')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
