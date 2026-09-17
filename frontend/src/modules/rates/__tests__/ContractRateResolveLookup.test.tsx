import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContractRateResolveLookup from '../components/ContractRateResolveLookup';
import * as ratesApi from '../api/ratesApi';
import type { ResolvedContractBillRateRes } from '../types/rateTypes';

vi.mock('../api/ratesApi', () => ({
  resolveContractBillRate: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Vai trò chuyên môn'), { target: { value: 'Lập trình viên cao cấp' } });
  fireEvent.change(screen.getByLabelText('Cấp bậc'), { target: { value: 'Cao cấp' } });
  fireEvent.change(screen.getByLabelText('Ngày phát sinh'), { target: { value: '2026-06-30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tra đơn giá' }));
}

const ROLE_OPTIONS = ['Lập trình viên cao cấp'];
const LEVELS_BY_ROLE = { 'Lập trình viên cao cấp': ['Cao cấp'] };

describe('ContractRateResolveLookup (NCL-07-CN-003 — QTN-16 ưu tiên đơn giá riêng hợp đồng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-01: có đơn giá riêng cho hợp đồng → isContractSpecific=true hiển thị badge "Đơn giá riêng hợp đồng"', async () => {
    const resolved: ResolvedContractBillRateRes = { dailyRate: 3_000_000, effectiveFrom: '2026-01-01', isContractSpecific: true };
    vi.mocked(ratesApi.resolveContractBillRate).mockResolvedValue(resolved);

    render(<ContractRateResolveLookup contractId={1} roleOptions={ROLE_OPTIONS} levelsByRole={LEVELS_BY_ROLE} />);
    fillAndSubmit();

    await waitFor(() => {
      expect(ratesApi.resolveContractBillRate).toHaveBeenCalledWith(1, {
        professionalRole: 'Lập trình viên cao cấp',
        level: 'Cao cấp',
        asOf: '2026-06-30',
      });
    });

    const result = await screen.findByTestId('contract-rate-resolve-result');
    expect(result).toHaveTextContent('Đơn giá riêng hợp đồng');
    expect(result).toHaveTextContent('3.000.000');
  });

  it('TC-02: chưa khai báo riêng → isContractSpecific=false hiển thị badge "Đơn giá chung công ty" (rơi về giá chung)', async () => {
    const resolved: ResolvedContractBillRateRes = { dailyRate: 2_500_000, effectiveFrom: '2024-01-01', isContractSpecific: false };
    vi.mocked(ratesApi.resolveContractBillRate).mockResolvedValue(resolved);

    render(<ContractRateResolveLookup contractId={2} roleOptions={ROLE_OPTIONS} levelsByRole={LEVELS_BY_ROLE} />);
    fillAndSubmit();

    const result = await screen.findByTestId('contract-rate-resolve-result');
    expect(result).toHaveTextContent('Đơn giá chung công ty');
    expect(result).not.toHaveTextContent('Đơn giá riêng hợp đồng');
  });

  it('404 (chưa có đơn giá chung lẫn riêng hợp lệ) hiển thị như thông báo thông tin, không phải lỗi hệ thống', async () => {
    vi.mocked(ratesApi.resolveContractBillRate).mockRejectedValue(
      new ratesApi.RatesApiError('RESOURCE_NOT_FOUND', 'Không tìm thấy hợp đồng với ID: 1', 404)
    );

    render(<ContractRateResolveLookup contractId={1} roleOptions={ROLE_OPTIONS} levelsByRole={LEVELS_BY_ROLE} />);
    fillAndSubmit();

    const notFound = await screen.findByTestId('contract-rate-resolve-not-found');
    expect(notFound).toHaveTextContent('Không tìm thấy hợp đồng với ID: 1');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
