import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TimeEntryRateResolveLookup from '../components/TimeEntryRateResolveLookup';
import * as ratesApi from '../api/ratesApi';
import type { ResolvedTimeEntryRateRes } from '../types/rateTypes';

vi.mock('../api/ratesApi', () => ({
  resolveTimeEntryBillRate: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

function fillAndSubmit(entryId = '100', level = 'Cao cấp') {
  fireEvent.change(screen.getByLabelText('ID dòng giờ công'), { target: { value: entryId } });
  fireEvent.change(screen.getByLabelText('Cấp bậc'), { target: { value: level } });
  fireEvent.click(screen.getByRole('button', { name: 'Tra đơn giá' }));
}

describe('TimeEntryRateResolveLookup (NCL-07-CN-005 — Tra cứu đơn giá áp dụng cho một dòng giờ công)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chặn phía client khi thiếu ID hoặc cấp bậc, không gọi API', async () => {
    render(<TimeEntryRateResolveLookup />);

    fireEvent.click(screen.getByRole('button', { name: 'Tra đơn giá' }));

    expect(await screen.findByText('ID dòng giờ công phải là số nguyên dương')).toBeInTheDocument();
    expect(screen.getByText('Cấp bậc không được để trống')).toBeInTheDocument();
    expect(ratesApi.resolveTimeEntryBillRate).not.toHaveBeenCalled();
  });

  it('tra đúng dòng giờ công và hiển thị appliedDailyRate làm trọng tâm (đơn giá cuối cùng đã nhân hệ số)', async () => {
    const resolved: ResolvedTimeEntryRateRes = {
      timeEntryId: 100,
      taskId: 5,
      projectId: 2,
      contractId: 1,
      professionalRole: 'Lập trình viên cao cấp',
      level: 'Cao cấp',
      workDate: '2026-06-30',
      hours: 8,
      workType: 'OVERTIME',
      dailyRate: 3_000_000,
      effectiveFrom: '2026-01-01',
      isContractSpecific: true,
      rateFactor: 1.5,
      appliedDailyRate: 4_500_000,
    };
    vi.mocked(ratesApi.resolveTimeEntryBillRate).mockResolvedValue(resolved);

    render(<TimeEntryRateResolveLookup />);
    fillAndSubmit();

    await waitFor(() => {
      expect(ratesApi.resolveTimeEntryBillRate).toHaveBeenCalledWith(100, 'Cao cấp');
    });

    const result = await screen.findByTestId('time-entry-rate-resolve-result');
    expect(result).toHaveTextContent('4.500.000');
    expect(result).toHaveTextContent('Đơn giá riêng hợp đồng');
    expect(result).toHaveTextContent('Ngoài giờ hành chính');
    expect(result).toHaveTextContent('3.000.000');
    expect(result).toHaveTextContent('1.5');
  });

  it('404 (dòng giờ công không tồn tại hoặc chưa đủ dữ liệu) hiển thị như thông báo thông tin', async () => {
    vi.mocked(ratesApi.resolveTimeEntryBillRate).mockRejectedValue(
      new ratesApi.RatesApiError('RESOURCE_NOT_FOUND', 'Khong tim thay dong gio cong voi ID: 999', 404)
    );

    render(<TimeEntryRateResolveLookup />);
    fillAndSubmit('999', 'Cao cấp');

    const notFound = await screen.findByTestId('time-entry-rate-resolve-not-found');
    expect(notFound).toHaveTextContent('Khong tim thay dong gio cong voi ID: 999');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('403 (vai trò khác VT-05/VT-07) hiển thị như lỗi', async () => {
    vi.mocked(ratesApi.resolveTimeEntryBillRate).mockRejectedValue(
      new ratesApi.RatesApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<TimeEntryRateResolveLookup />);
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền thực hiện thao tác này.');
  });
});
