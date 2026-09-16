import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import RateResolveLookup from '../components/RateResolveLookup';
import * as ratesApi from '../api/ratesApi';
import type { BillRateRes } from '../types/rateTypes';

vi.mock('../api/ratesApi', () => ({
  resolveBillRate: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

describe('RateResolveLookup (NCL-07-CN-002 — Đặt hiệu lực theo thời điểm cho đơn giá)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chặn phía client khi thiếu trường bắt buộc, không gọi API', async () => {
    render(<RateResolveLookup />);

    fireEvent.click(screen.getByRole('button', { name: 'Tra đơn giá' }));

    expect(await screen.findByText('Vai trò chuyên môn không được để trống')).toBeInTheDocument();
    expect(ratesApi.resolveBillRate).not.toHaveBeenCalled();
  });

  it('TC-02: tra đúng dòng hiệu lực gần nhất không vượt quá ngày phát sinh, hiển thị effectiveFrom trả về', async () => {
    const resolved: BillRateRes = {
      professionalRole: 'Lập trình viên cao cấp',
      level: 'Cao cấp',
      dailyRate: 2_500_000,
      effectiveFrom: '2026-01-01',
    };
    vi.mocked(ratesApi.resolveBillRate).mockResolvedValue(resolved);

    render(<RateResolveLookup />);

    fireEvent.change(screen.getByLabelText('Vai trò chuyên môn'), { target: { value: 'Lập trình viên cao cấp' } });
    fireEvent.change(screen.getByLabelText('Cấp bậc'), { target: { value: 'Cao cấp' } });
    fireEvent.change(screen.getByLabelText('Ngày phát sinh'), { target: { value: '2026-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tra đơn giá' }));

    await waitFor(() => {
      expect(ratesApi.resolveBillRate).toHaveBeenCalledWith({
        professionalRole: 'Lập trình viên cao cấp',
        level: 'Cao cấp',
        asOf: '2026-06-30',
      });
    });

    const result = await screen.findByTestId('rate-resolve-result');
    expect(result).toHaveTextContent('Lập trình viên cao cấp');
    expect(result).toHaveTextContent('2.500.000');
    expect(result).toHaveTextContent('1/1/2026');
  });

  it('404 hiển thị như thông báo thông tin (không phải lỗi hệ thống), giữ nguyên message backend', async () => {
    vi.mocked(ratesApi.resolveBillRate).mockRejectedValue(
      new ratesApi.RatesApiError('RESOURCE_NOT_FOUND', 'Chưa có đơn giá hiệu lực cho Tester (Junior) tại ngày 2020-01-01', 404)
    );

    render(<RateResolveLookup />);

    fireEvent.change(screen.getByLabelText('Vai trò chuyên môn'), { target: { value: 'Tester' } });
    fireEvent.change(screen.getByLabelText('Cấp bậc'), { target: { value: 'Junior' } });
    fireEvent.change(screen.getByLabelText('Ngày phát sinh'), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tra đơn giá' }));

    const notFound = await screen.findByTestId('rate-resolve-not-found');
    expect(notFound).toHaveTextContent('Chưa có đơn giá hiệu lực cho Tester (Junior) tại ngày 2020-01-01');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
