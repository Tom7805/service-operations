import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContractAppendixModal from '../components/ContractAppendixModal';
import * as contractsApi from '../api/contractsApi';
import type { ContractRes } from '../types/contractTypes';

vi.mock('../api/contractsApi', () => ({
  createAppendix: vi.fn(),
  fetchAppendices: vi.fn(),
  ContractsApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'ContractsApiError';
    }
  },
}));

const contract: ContractRes = {
  id: 5,
  contractCode: 'HD-4K7X2Q9',
  name: 'Hợp đồng triển khai ERP',
  opportunityId: 12,
  customerId: 1,
  customerName: 'Công ty TNHH ABC',
  quoteId: 30,
  contractType: 'MILESTONE',
  totalValue: 500_000_000,
  limitValue: 700_000_000,
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  status: 'ACTIVE',
  notes: null,
  createdBy: 'sale01',
  createdAt: '2026-01-15T10:00:00',
};

describe('ContractAppendixModal (NCL-04-CN-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contractsApi.fetchAppendices).mockResolvedValue([]);
  });

  it('TC-03: từ chối khi không phải Nhân viên kinh doanh (VT-04)', () => {
    render(
      <ContractAppendixModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-05']} />
    );

    expect(screen.getByText(/yêu cầu vai trò Nhân viên kinh doanh/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu phụ lục/i })).toBeDisabled();
    expect(contractsApi.createAppendix).not.toHaveBeenCalled();
  });

  const savedAppendix = {
    id: 101,
    contractId: 5,
    content: 'Mở rộng phạm vi giai đoạn 2',
    adjustmentValue: 200_000_000,
    valueBefore: 500_000_000,
    valueAfter: 700_000_000,
    effectiveDate: '2026-10-01',
    createdBy: 'sale01',
    createdAt: '2026-09-07T10:15:00',
  };

  it('TC-01: lưu thành công gửi đúng payload, modal ở lại và làm mới lịch sử', async () => {
    vi.mocked(contractsApi.createAppendix).mockResolvedValue(savedAppendix);
    // Trước khi lưu chưa có phụ lục; sau khi lưu API trả về phụ lục vừa tạo.
    vi.mocked(contractsApi.fetchAppendices)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([savedAppendix]);
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <ContractAppendixModal
        contract={contract}
        isOpen
        onClose={onClose}
        onSaved={onSaved}
        currentUserRoles={['VT-04']}
      />
    );

    fireEvent.change(screen.getByLabelText(/Nội dung điều chỉnh/i), {
      target: { value: 'Mở rộng phạm vi giai đoạn 2' },
    });
    fireEvent.change(screen.getByLabelText(/Giá trị điều chỉnh/i), {
      target: { value: '200000000' },
    });
    fireEvent.change(screen.getByLabelText(/Ngày hiệu lực/i), {
      target: { value: '2026-10-01' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Lưu phụ lục/i }));

    await waitFor(() => {
      expect(contractsApi.createAppendix).toHaveBeenCalledWith(5, {
        content: 'Mở rộng phạm vi giai đoạn 2',
        adjustmentValue: 200000000,
        effectiveDate: '2026-10-01',
      });
      expect(onSaved).toHaveBeenCalled();
    });

    // TC-05: phụ lục vừa lập xuất hiện trong "Lịch sử phụ lục"; modal KHÔNG tự đóng.
    await waitFor(() => {
      expect(screen.getByTestId('appendix-history-table')).toBeInTheDocument();
    });
    expect(screen.getByText(/Lịch sử phụ lục \(1\)/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('TC-05: mở modal nạp sẵn lịch sử phụ lục đã lập của hợp đồng', async () => {
    vi.mocked(contractsApi.fetchAppendices).mockResolvedValue([savedAppendix]);

    render(
      <ContractAppendixModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-04']} />
    );

    expect(contractsApi.fetchAppendices).toHaveBeenCalledWith(5);
    await waitFor(() => {
      expect(screen.getByTestId('appendix-history-table')).toBeInTheDocument();
    });
    expect(screen.getByText('Mở rộng phạm vi giai đoạn 2')).toBeInTheDocument();
    expect(screen.getByText('sale01')).toBeInTheDocument();
  });

  it('TC-02: chặn khi giá trị điều chỉnh bằng 0', async () => {
    render(
      <ContractAppendixModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-04']} />
    );

    fireEvent.change(screen.getByLabelText(/Nội dung điều chỉnh/i), {
      target: { value: 'Đề xuất tăng giá trị theo dự án' },
    });
    fireEvent.change(screen.getByLabelText(/Giá trị điều chỉnh/i), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText(/Ngày hiệu lực/i), {
      target: { value: '2026-10-01' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Lưu phụ lục/i }));

    await waitFor(() => {
      expect(screen.getByText(/khác 0/i)).toBeInTheDocument();
    });
    expect(contractsApi.createAppendix).not.toHaveBeenCalled();
  });
});
