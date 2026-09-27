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

/** Kỳ tài chính trả về cho /fiscal-periods/** — `null` = máy chủ báo lỗi (báo cáo giữ mặc định tháng 1). */
let fiscalBody: unknown = null;

function fiscalYear(year: number, startMonth: number) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const idx = startMonth - 1 + i;
    const y = year + Math.floor(idx / 12);
    const m = String((idx % 12) + 1).padStart(2, '0');
    return { period: i + 1, yearMonth: `${y}-${m}`, startDate: `${y}-${m}-01`, endDate: `${y}-${m}-28` };
  });
  const quarters = [0, 1, 2, 3].map((q) => ({
    quarter: q + 1,
    startDate: months[q * 3].startDate,
    endDate: months[q * 3 + 2].endDate,
  }));
  return { fiscalYear: year, startMonth, startDate: months[0].startDate, endDate: months[11].endDate, quarters, months };
}

/** Trả báo cáo cho /reports/**, kỳ tài chính cho /fiscal-periods/**. */
function respondWith(body: MonthlyRevenueReportRes) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    if (String(input).includes('/fiscal-periods/')) {
      return fiscalBody
        ? new Response(JSON.stringify({ success: true, data: fiscalBody }), { status: 200 })
        : new Response(JSON.stringify({ success: false, errorCode: 'RESOURCE_NOT_FOUND' }), { status: 404 });
    }
    return new Response(JSON.stringify({ success: true, data: body }), { status: 200 });
  });
}

const revenueCalls = () =>
  vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/reports/revenue/monthly'));

describe('RevenueReportPage (NCL-11-CN-005)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('sessionStorage', memoryStorage());
    vi.stubGlobal('fetch', vi.fn());
    fiscalBody = null;
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
    expect(String(revenueCalls()[0][0])).toContain('/reports/revenue/monthly?fromMonth=');
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
    await waitFor(() => expect(revenueCalls()).toHaveLength(1));

    fireEvent.change(screen.getByLabelText('Từ tháng'), { target: { value: '2026-12' } });
    fireEvent.change(screen.getByLabelText('Đến tháng'), { target: { value: '2026-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem báo cáo' }));

    expect(await screen.findByText('Tháng kết thúc không được trước tháng bắt đầu.')).toBeInTheDocument();
    expect(revenueCalls()).toHaveLength(1);
  });

  it('NCL-15-CN-002 TC-01: năm tài chính bắt đầu tháng 4 → báo cáo mặc định chia kỳ từ tháng 4', async () => {
    const now = new Date();
    const fyYear = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    fiscalBody = fiscalYear(fyYear, 4);
    respondWith(report(true));
    render(<RevenueReportPage currentUserRoles={['VT-01']} />);

    await waitFor(() => expect(revenueCalls()).toHaveLength(1));
    expect(String(revenueCalls()[0][0])).toContain(`fromMonth=${fyYear}-04`);
    expect(screen.getByLabelText('Từ tháng')).toHaveValue(`${fyYear}-04`);
    expect(screen.getByTestId('revenue-fiscal-quickpick')).toHaveTextContent('từ T4');
  });

  it('chọn nhanh Quý 1 / Cả năm tài chính gửi đúng khoảng tháng', async () => {
    fiscalBody = fiscalYear(2026, 4);
    respondWith(report(true));
    render(<RevenueReportPage currentUserRoles={['VT-05']} />);
    await waitFor(() => expect(revenueCalls()).toHaveLength(1));

    fireEvent.click(await screen.findByTestId('revenue-fy-q1'));
    await waitFor(() => expect(String(revenueCalls()[revenueCalls().length - 1]?.[0])).toContain('fromMonth=2026-04&toMonth=2026-06'));
    fireEvent.click(screen.getByTestId('revenue-fy-full'));
    await waitFor(() => expect(String(revenueCalls()[revenueCalls().length - 1]?.[0])).toContain('fromMonth=2026-04&toMonth=2027-03'));
  });

  it('không lấy được kỳ tài chính thì giữ mặc định từ tháng 1 năm dương lịch', async () => {
    respondWith(report(true));
    render(<RevenueReportPage currentUserRoles={['VT-01']} />);

    await waitFor(() => expect(revenueCalls()).toHaveLength(1));
    expect(String(revenueCalls()[0][0])).toContain(`fromMonth=${new Date().getFullYear()}-01`);
    expect(screen.queryByTestId('revenue-fiscal-quickpick')).toBeNull();
  });
});
