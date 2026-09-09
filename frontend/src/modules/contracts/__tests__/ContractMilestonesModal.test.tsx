import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContractMilestonesModal from '../components/ContractMilestonesModal';
import * as contractsApi from '../api/contractsApi';
import type { ContractRes, ContractMilestoneRes } from '../types/contractTypes';

vi.mock('../api/contractsApi', () => ({
  fetchMilestones: vi.fn(),
  replaceMilestones: vi.fn(),
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
  totalValue: 1_000_000_000,
  limitValue: null,
  startDate: '2026-10-01',
  endDate: '2027-09-30',
  status: 'DRAFT',
  notes: null,
  createdBy: 'ketoan01',
  createdAt: '2026-09-07T10:15:00',
};

const existingMilestones: ContractMilestoneRes[] = [
  {
    id: 101,
    contractId: 5,
    name: 'Nghiệm thu giai đoạn 1',
    percentage: 30,
    amount: 300_000_000,
    expectedDate: '2026-11-30',
    acceptanceCondition: 'Khách hàng ký biên bản nghiệm thu',
    status: 'PENDING',
    createdBy: 'ketoan01',
  },
  {
    id: 102,
    contractId: 5,
    name: 'Bàn giao và quyết toán',
    percentage: 70,
    amount: 700_000_000,
    expectedDate: '2027-03-31',
    acceptanceCondition: 'Hoàn tất bàn giao',
    status: 'PENDING',
    createdBy: 'ketoan01',
  },
];

describe('ContractMilestonesModal (NCL-04-CN-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-03: ẩn bảng và chỉ hiện cảnh báo vai trò khi không phải Kế toán (VT-05)', () => {
    render(
      <ContractMilestonesModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-04']} />
    );

    expect(screen.getByText(/yêu cầu vai trò Kế toán/i)).toBeInTheDocument();
    expect(contractsApi.fetchMilestones).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Lưu danh sách mốc/i })).toBeDisabled();
  });

  it('TC-01: tải đúng danh sách mốc hiện có và hiển thị đúng tổng', async () => {
    vi.mocked(contractsApi.fetchMilestones).mockResolvedValue(existingMilestones);

    render(
      <ContractMilestonesModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-05']} />
    );

    expect(contractsApi.fetchMilestones).toHaveBeenCalledWith(5);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Nghiệm thu giai đoạn 1')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Bàn giao và quyết toán')).toBeInTheDocument();
    expect(screen.getByText(/Tổng: 1\.000\.000\.000 \/ 1\.000\.000\.000/)).toBeInTheDocument();
  });

  it('TC-02 (QTN-19): chặn lưu khi tổng các mốc khác giá trị hợp đồng', async () => {
    vi.mocked(contractsApi.fetchMilestones).mockResolvedValue(existingMilestones);

    render(
      <ContractMilestonesModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-05']} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Nghiệm thu giai đoạn 1')).toBeInTheDocument();
    });

    // Đổi tỷ lệ mốc 1 từ 30% xuống 10% → "Giá trị" tự tính lại còn 100.000.000,
    // tổng 2 mốc thành 800.000.000 ≠ giá trị hợp đồng.
    const firstPercent = screen.getAllByLabelText('Tỷ lệ phần trăm')[0];
    fireEvent.change(firstPercent, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu danh sách mốc/i }));

    await waitFor(() => {
      expect(screen.getByText(/phải bằng giá trị hợp đồng/i)).toBeInTheDocument();
    });
    expect(contractsApi.replaceMilestones).not.toHaveBeenCalled();
  });

  it('lưu thành công gửi toàn bộ mảng qua replaceMilestones khi tổng khớp giá trị hợp đồng', async () => {
    vi.mocked(contractsApi.fetchMilestones).mockResolvedValue(existingMilestones);
    vi.mocked(contractsApi.replaceMilestones).mockResolvedValue(existingMilestones);
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <ContractMilestonesModal
        contract={contract}
        isOpen
        onClose={onClose}
        onSaved={onSaved}
        currentUserRoles={['VT-05']}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Nghiệm thu giai đoạn 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Lưu danh sách mốc/i }));

    await waitFor(() => {
      expect(contractsApi.replaceMilestones).toHaveBeenCalledWith(5, [
        {
          name: 'Nghiệm thu giai đoạn 1',
          percentage: 30,
          amount: 300_000_000,
          expectedDate: '2026-11-30',
          acceptanceCondition: 'Khách hàng ký biên bản nghiệm thu',
        },
        {
          name: 'Bàn giao và quyết toán',
          percentage: 70,
          amount: 700_000_000,
          expectedDate: '2027-03-31',
          acceptanceCondition: 'Hoàn tất bàn giao',
        },
      ]);
      expect(onSaved).toHaveBeenCalledWith(existingMilestones);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('nhập tỷ lệ % thì "Giá trị" tự tính và khoá lại; xoá % thì mở lại để nhập số tiền tay', async () => {
    vi.mocked(contractsApi.fetchMilestones).mockResolvedValue([]);

    render(
      <ContractMilestonesModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-05']} />
    );

    // Danh sách rỗng → sẵn một dòng mới, ô "Giá trị" trống hẳn (không kẹt "0"), nhập tay được.
    const amountInput = await screen.findByLabelText('Giá trị mốc');
    expect(amountInput).toHaveValue(null);
    expect(amountInput).not.toHaveAttribute('readonly');

    // Nhập tỷ lệ 30% → "Giá trị" = 30% × giá trị hợp đồng và bị khoá (chỉ đọc).
    fireEvent.change(screen.getByLabelText('Tỷ lệ phần trăm'), { target: { value: '30' } });
    expect(amountInput).toHaveValue(300_000_000);
    expect(amountInput).toHaveAttribute('readonly');

    // Đổi % → "Giá trị" tính lại theo số mới.
    fireEvent.change(screen.getByLabelText('Tỷ lệ phần trăm'), { target: { value: '5' } });
    expect(amountInput).toHaveValue(50_000_000);

    // Xoá trắng ô "Tỷ lệ (%)" → "Giá trị" về trống và mở khoá để nhập tay.
    fireEvent.change(screen.getByLabelText('Tỷ lệ phần trăm'), { target: { value: '' } });
    expect(amountInput).toHaveValue(null);
    expect(amountInput).not.toHaveAttribute('readonly');

    // Nhập số tiền tuỳ ý → nhận đúng số đó.
    fireEvent.change(amountInput, { target: { value: '250000000' } });
    expect(amountInput).toHaveValue(250_000_000);
  });

  it('hiển thị lỗi khi tải danh sách mốc thất bại', async () => {
    vi.mocked(contractsApi.fetchMilestones).mockRejectedValue(
      new contractsApi.ContractsApiError('RESOURCE_NOT_FOUND', 'Không tìm thấy hợp đồng.', 404)
    );

    render(
      <ContractMilestonesModal contract={contract} isOpen onClose={vi.fn()} currentUserRoles={['VT-05']} />
    );

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy hợp đồng.')).toBeInTheDocument();
    });
  });
});
