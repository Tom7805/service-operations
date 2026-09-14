import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContractTypeLimitModal from '../components/ContractTypeLimitModal';
import * as contractsApi from '../api/contractsApi';
import type { ContractRes } from '../types/contractTypes';

vi.mock('../api/contractsApi', () => ({
  updateTypeAndLimit: vi.fn(),
}));

const contract: ContractRes = {
  id: 5,
  contractCode: 'HD-4K7X2Q9',
  name: 'Hợp đồng triển khai ERP',
  opportunityId: 12,
  customerId: 1,
  customerName: 'Công ty TNHH ABC',
  quoteId: 30,
  contractType: 'TIME_AND_MATERIAL',
  totalValue: 500_000_000,
  limitValue: 700_000_000,
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  status: 'ACTIVE',
  notes: null,
  createdBy: 'sale01',
  createdAt: '2026-01-15T10:00:00',
};

describe('ContractTypeLimitModal (NCL-04-CN-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-03: từ chối khi không phải Kế toán (VT-05)', () => {
    render(
      <ContractTypeLimitModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-04']} />
    );

    expect(screen.getByText(/yêu cầu vai trò Kế toán/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu/i })).toBeDisabled();
    expect(contractsApi.updateTypeAndLimit).not.toHaveBeenCalled();
  });

  it('TC-01: lưu thành công gửi đúng payload và đóng modal', async () => {
    vi.mocked(contractsApi.updateTypeAndLimit).mockResolvedValue({
      ...contract,
      contractType: 'FIXED_PRICE',
      totalValue: 600_000_000,
      limitValue: 800_000_000,
    });
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <ContractTypeLimitModal
        contract={contract}
        isOpen
        onClose={onClose}
        onSaved={onSaved}
        currentUserRoles={['VT-05']}
      />
    );

    fireEvent.change(screen.getByLabelText(/Loại hợp đồng/i), { target: { value: 'FIXED_PRICE' } });
    fireEvent.change(screen.getByLabelText(/Giá trị hợp đồng/i), { target: { value: '600000000' } });
    fireEvent.change(screen.getByLabelText(/Hạn mức/i), { target: { value: '800000000' } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu/i }));

    await waitFor(() => {
      expect(contractsApi.updateTypeAndLimit).toHaveBeenCalledWith(5, {
        contractType: 'FIXED_PRICE',
        totalValue: 600000000,
        limitValue: 800000000,
      });
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('TC-02: chặn khi hạn mức nhỏ hơn giá trị hợp đồng', async () => {
    render(
      <ContractTypeLimitModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-05']} />
    );

    fireEvent.change(screen.getByLabelText(/Giá trị hợp đồng/i), { target: { value: '900000000' } });
    fireEvent.change(screen.getByLabelText(/Hạn mức/i), { target: { value: '500000000' } });

    fireEvent.click(screen.getByRole('button', { name: /Lưu/i }));

    await waitFor(() => {
      expect(screen.getByText(/Hạn mức không được nhỏ hơn giá trị hợp đồng/i)).toBeInTheDocument();
    });
    expect(contractsApi.updateTypeAndLimit).not.toHaveBeenCalled();
  });

  it('TC-04: hiển thị lỗi từ máy chủ khi lưu thất bại', async () => {
    vi.mocked(contractsApi.updateTypeAndLimit).mockRejectedValue(new Error('Không thể cập nhật hợp đồng.'));

    render(
      <ContractTypeLimitModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-05']} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Lưu/i }));

    await waitFor(() => {
      expect(screen.getByText(/Không thể cập nhật hợp đồng\./i)).toBeInTheDocument();
    });
  });
});
