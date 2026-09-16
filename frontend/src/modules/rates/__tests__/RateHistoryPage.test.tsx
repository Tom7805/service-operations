import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import RateHistoryPage from '../pages/RateHistoryPage';
import * as ratesApi from '../api/ratesApi';
import type { BillRateHistoryRes } from '../types/rateTypes';

vi.mock('../api/ratesApi', () => ({
  fetchBillRateHistory: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

function fillAndSearch(role = 'Lập trình viên cao cấp', level = 'Cao cấp') {
  fireEvent.change(screen.getByLabelText('Vai trò chuyên môn'), { target: { value: role } });
  fireEvent.change(screen.getByLabelText('Cấp bậc'), { target: { value: level } });
  fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử' }));
}

describe('RateHistoryPage (NCL-07-CN-007 — Xem lịch sử thay đổi đơn giá)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-03: vai trò khác Kế toán/Quản trị viên bị từ chối, không gọi API', () => {
    render(<RateHistoryPage currentUserRoles={['VT-04']} currentUserName="Đỗ Thị Mai" />);

    expect(screen.getByTestId('rate-history-access-denied')).toBeInTheDocument();
    expect(ratesApi.fetchBillRateHistory).not.toHaveBeenCalled();
  });

  it('chặn phía client khi thiếu vai trò/cấp bậc, không gọi API', async () => {
    render(<RateHistoryPage currentUserRoles={['VT-05']} currentUserName="Hoàng Văn Nam" />);

    fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử' }));

    expect(await screen.findByText('Vai trò chuyên môn không được để trống')).toBeInTheDocument();
    expect(ratesApi.fetchBillRateHistory).not.toHaveBeenCalled();
  });

  it('TC-01: nhiều mốc đơn giá → hiển thị bảng lịch sử, mới nhất trước, mốc hiện hành có badge', async () => {
    const history: BillRateHistoryRes = {
      professionalRole: 'Lập trình viên cao cấp',
      level: 'Cao cấp',
      everChanged: true,
      entries: [
        { id: 1, dailyRate: 500_000, effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31', current: false, changedBy: 'ke.toan01', changedAt: '2025-01-01T09:00:00' },
        { id: 2, dailyRate: 600_000, effectiveFrom: '2026-01-01', effectiveTo: null, current: true, changedBy: 'ke.toan02', changedAt: '2025-12-20T14:00:00' },
      ],
    };
    vi.mocked(ratesApi.fetchBillRateHistory).mockResolvedValue(history);

    render(<RateHistoryPage currentUserRoles={['VT-05']} currentUserName="Hoàng Văn Nam" />);
    fillAndSearch();

    await waitFor(() => {
      expect(ratesApi.fetchBillRateHistory).toHaveBeenCalledWith('Lập trình viên cao cấp', 'Cao cấp');
    });

    const table = await screen.findByTestId('rate-history-table');
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    // Mới nhất (mốc 600.000, current) hiển thị trước — đảo mảng so với thứ tự backend trả.
    expect(rows[0]).toHaveTextContent('600.000');
    expect(rows[0]).toHaveTextContent('Đang áp dụng');
    expect(rows[1]).toHaveTextContent('500.000');
    expect(rows[1]).toHaveTextContent('ke.toan01');

    expect(screen.queryByTestId('rate-history-never-changed')).toBeNull();
  });

  it('TC-02: chỉ 1 mốc (everChanged=false) → hiển thị rõ "chưa từng thay đổi"', async () => {
    const history: BillRateHistoryRes = {
      professionalRole: 'Kiểm thử viên',
      level: 'Trung cấp',
      everChanged: false,
      entries: [
        { id: 5, dailyRate: 1_000_000, effectiveFrom: '2026-01-01', effectiveTo: null, current: true, changedBy: null, changedAt: null },
      ],
    };
    vi.mocked(ratesApi.fetchBillRateHistory).mockResolvedValue(history);

    render(<RateHistoryPage currentUserRoles={['VT-07']} currentUserName="Trần Thị B" />);
    fillAndSearch('Kiểm thử viên', 'Trung cấp');

    expect(await screen.findByTestId('rate-history-never-changed')).toBeInTheDocument();
    // changedBy/changedAt null -> hiển thị "—" thay vì để trống.
    const table = screen.getByTestId('rate-history-table');
    expect(table).toHaveTextContent('—');
  });

  it('404 (chưa từng khai báo đơn giá) hiển thị như thông báo thông tin, không phải lỗi hệ thống', async () => {
    vi.mocked(ratesApi.fetchBillRateHistory).mockRejectedValue(
      new ratesApi.RatesApiError('RESOURCE_NOT_FOUND', 'Chưa từng khai báo đơn giá cho vai trò/cấp bậc này', 404)
    );

    render(<RateHistoryPage currentUserRoles={['VT-05']} currentUserName="Hoàng Văn Nam" />);
    fillAndSearch();

    const notFound = await screen.findByTestId('rate-history-not-found');
    expect(notFound).toHaveTextContent('Chưa từng khai báo đơn giá cho vai trò/cấp bậc này');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
