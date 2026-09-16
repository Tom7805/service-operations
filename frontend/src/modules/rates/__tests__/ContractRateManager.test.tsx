import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContractRateManager from '../components/ContractRateManager';
import * as ratesApi from '../api/ratesApi';
import type { ContractBillRateRes } from '../types/rateTypes';

vi.mock('../api/ratesApi', () => ({
  fetchContractBillRates: vi.fn(),
  createContractBillRate: vi.fn(),
  resolveContractBillRate: vi.fn(),
  RatesApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'RatesApiError';
    }
  },
}));

const contractRates: ContractBillRateRes[] = [
  { contractId: 1, professionalRole: 'Lập trình viên cao cấp', level: 'Cao cấp', dailyRate: 3_000_000, effectiveFrom: '2026-01-01' },
];

describe('ContractRateManager (NCL-07-CN-003 — Khai báo đơn giá riêng theo hợp đồng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chưa nhập ID hợp đồng thì chưa gọi API, chỉ hiện ô nhập', () => {
    render(<ContractRateManager currentUserRoles={['VT-05']} />);

    expect(screen.getByLabelText('ID hợp đồng')).toBeInTheDocument();
    expect(ratesApi.fetchContractBillRates).not.toHaveBeenCalled();
    expect(screen.queryByTestId('contract-rate-table')).toBeNull();
  });

  it('TC-01/TC-02: nhập ID hợp đồng rồi mở → tải đúng danh sách đơn giá riêng của hợp đồng đó', async () => {
    vi.mocked(ratesApi.fetchContractBillRates).mockResolvedValue(contractRates);

    render(<ContractRateManager currentUserRoles={['VT-05']} />);

    fireEvent.change(screen.getByLabelText('ID hợp đồng'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đơn giá hợp đồng' }));

    await waitFor(() => expect(ratesApi.fetchContractBillRates).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByTestId('contract-rate-table')).toBeInTheDocument());
    expect(screen.getByText('Lập trình viên cao cấp')).toBeInTheDocument();
  });

  it('khai báo đơn giá riêng thành công thì bảng cập nhật ngay, không cần tải lại', async () => {
    vi.mocked(ratesApi.fetchContractBillRates).mockResolvedValue([]);
    const created: ContractBillRateRes = {
      contractId: 7,
      professionalRole: 'Kiểm thử viên',
      level: 'Trung cấp',
      dailyRate: 1_800_000,
      effectiveFrom: '2026-02-01',
    };
    vi.mocked(ratesApi.createContractBillRate).mockResolvedValue(created);

    render(<ContractRateManager currentUserRoles={['VT-07']} />);

    fireEvent.change(screen.getByLabelText('ID hợp đồng'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đơn giá hợp đồng' }));

    await waitFor(() => expect(screen.getByTestId('contract-rate-empty')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Khai báo đơn giá riêng/i }));

    const modal = within(screen.getByRole('dialog'));
    fireEvent.change(modal.getByLabelText('Vai trò chuyên môn'), { target: { value: 'Kiểm thử viên' } });
    fireEvent.change(modal.getByLabelText('Cấp bậc'), { target: { value: 'Trung cấp' } });
    fireEvent.change(modal.getByLabelText('Đơn giá theo ngày công'), { target: { value: '1800000' } });
    fireEvent.change(modal.getByLabelText('Ngày hiệu lực'), { target: { value: '2026-02-01' } });
    fireEvent.click(modal.getByRole('button', { name: 'Lưu đơn giá riêng' }));

    await waitFor(() => {
      expect(ratesApi.createContractBillRate).toHaveBeenCalledWith(7, {
        professionalRole: 'Kiểm thử viên',
        level: 'Trung cấp',
        dailyRate: 1_800_000,
        effectiveFrom: '2026-02-01',
      });
    });

    await waitFor(() => expect(screen.getByTestId('contract-rate-table')).toBeInTheDocument());
    expect(screen.getByText('Kiểm thử viên')).toBeInTheDocument();
  });

  it('lỗi tải danh sách (vd hợp đồng không tồn tại) hiển thị rõ và có nút thử lại', async () => {
    vi.mocked(ratesApi.fetchContractBillRates).mockRejectedValue(
      new ratesApi.RatesApiError('RESOURCE_NOT_FOUND', 'Không tìm thấy hợp đồng với ID: 999', 404)
    );

    render(<ContractRateManager currentUserRoles={['VT-05']} />);

    fireEvent.change(screen.getByLabelText('ID hợp đồng'), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đơn giá hợp đồng' }));

    expect(await screen.findByText('Không tìm thấy hợp đồng với ID: 999')).toBeInTheDocument();
  });
});
