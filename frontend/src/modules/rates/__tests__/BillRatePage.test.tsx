import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BillRatePage from '../pages/BillRatePage';
import * as ratesApi from '../api/ratesApi';
import type { BillRateRes } from '../types/rateTypes';

vi.mock('../api/ratesApi', () => ({
  fetchCurrentBillRates: vi.fn(),
  createBillRate: vi.fn(),
  resolveBillRate: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

const billRates: BillRateRes[] = [
  { professionalRole: 'Lập trình viên', level: 'Trung cấp', dailyRate: 1_500_000, effectiveFrom: '2024-01-01' },
  { professionalRole: 'Lập trình viên', level: 'Cao cấp', dailyRate: 2_500_000, effectiveFrom: '2024-01-01' },
];

describe('BillRatePage (NCL-07-CN-001 — Khai báo bảng đơn giá theo vai trò)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-03: vai trò khác Kế toán/Quản trị viên bị từ chối, không gọi API danh sách đơn giá', () => {
    render(<BillRatePage currentUserRoles={['VT-04']} currentUserName="Đỗ Thị Mai" />);

    expect(screen.getByTestId('bill-rate-access-denied')).toBeInTheDocument();
    expect(ratesApi.fetchCurrentBillRates).not.toHaveBeenCalled();
  });

  it('TC-01: Kế toán (VT-05) xem được bảng đơn giá hiện hành', async () => {
    vi.mocked(ratesApi.fetchCurrentBillRates).mockResolvedValue(billRates);

    render(<BillRatePage currentUserRoles={['VT-05']} currentUserName="Hoàng Văn Nam" />);

    expect(ratesApi.fetchCurrentBillRates).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId('bill-rate-table')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Lập trình viên')).toHaveLength(2);
    expect(screen.getByText('Trung cấp')).toBeInTheDocument();
    expect(screen.getByText('Cao cấp')).toBeInTheDocument();
  });

  it('Quản trị viên (VT-07) cũng khai báo được: mở modal, điền form, lưu thành công thì bảng cập nhật ngay', async () => {
    vi.mocked(ratesApi.fetchCurrentBillRates).mockResolvedValue([]);
    const created: BillRateRes = {
      professionalRole: 'Kiểm thử viên',
      level: 'Trung cấp',
      dailyRate: 1_200_000,
      effectiveFrom: '2020-01-01',
    };
    vi.mocked(ratesApi.createBillRate).mockResolvedValue(created);

    render(<BillRatePage currentUserRoles={['VT-07']} currentUserName="Trần Thị B" />);

    await waitFor(() => expect(screen.getByTestId('bill-rate-empty')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Khai báo đơn giá/i }));

    const modal = within(screen.getByRole('dialog'));
    fireEvent.change(modal.getByLabelText('Vai trò chuyên môn'), { target: { value: 'Kiểm thử viên' } });
    fireEvent.change(modal.getByLabelText('Cấp bậc'), { target: { value: 'Trung cấp' } });
    fireEvent.change(modal.getByLabelText('Đơn giá theo ngày công'), { target: { value: '1200000' } });
    fireEvent.change(modal.getByLabelText('Ngày hiệu lực'), { target: { value: '2020-01-01' } });

    fireEvent.click(modal.getByRole('button', { name: 'Lưu đơn giá' }));

    await waitFor(() => {
      expect(ratesApi.createBillRate).toHaveBeenCalledWith({
        professionalRole: 'Kiểm thử viên',
        level: 'Trung cấp',
        dailyRate: 1_200_000,
        effectiveFrom: '2020-01-01',
      });
    });

    await waitFor(() => expect(screen.getByText('Kiểm thử viên')).toBeInTheDocument());
  });

  it('TC-02: chặn phía client khi thiếu trường bắt buộc, không gọi API tạo', async () => {
    vi.mocked(ratesApi.fetchCurrentBillRates).mockResolvedValue([]);

    render(<BillRatePage currentUserRoles={['VT-05']} currentUserName="Hoàng Văn Nam" />);

    await waitFor(() => expect(screen.getByTestId('bill-rate-empty')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Khai báo đơn giá/i }));
    const modal = within(screen.getByRole('dialog'));
    fireEvent.click(modal.getByRole('button', { name: 'Lưu đơn giá' }));

    expect(await modal.findByText('Vai trò chuyên môn không được để trống')).toBeInTheDocument();
    expect(ratesApi.createBillRate).not.toHaveBeenCalled();
  });
});
