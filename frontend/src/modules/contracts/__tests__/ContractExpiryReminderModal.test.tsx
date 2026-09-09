import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContractExpiryReminderModal from '../components/ContractExpiryReminderModal';
import * as contractsApi from '../api/contractsApi';
import type { ContractExpiryAlertRes } from '../types/contractTypes';

vi.mock('../api/contractsApi', () => ({
  fetchExpiringContracts: vi.fn(),
  getExpiringContracts: vi.fn(),
  ContractsApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'ContractsApiError';
    }
  },
}));

const mockExpiringContracts: ContractExpiryAlertRes[] = [
  {
    contractId: 1,
    contractCode: 'HD-0001',
    name: 'Hợp đồng ERP',
    customerId: 10,
    endDate: '2026-09-15',
    daysRemaining: 6,
  },
  {
    contractId: 2,
    contractCode: 'HD-0002',
    name: 'Hợp đồng Bảo trì',
    customerId: 10,
    endDate: '2026-09-28',
    daysRemaining: 19,
  },
];

describe('ContractExpiryReminderModal (NCL-04-CN-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-01: tải và hiển thị đúng danh sách hợp đồng sắp hết hạn trong 30 ngày', async () => {
    vi.mocked(contractsApi.fetchExpiringContracts).mockResolvedValue(mockExpiringContracts);

    render(
      <ContractExpiryReminderModal
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-05']}
      />
    );

    expect(contractsApi.fetchExpiringContracts).toHaveBeenCalledWith(30);

    await waitFor(() => {
      expect(screen.getByTestId('expiring-contracts-table')).toBeInTheDocument();
    });

    expect(screen.getByText('HD-0001')).toBeInTheDocument();
    expect(screen.getByText('Hợp đồng ERP')).toBeInTheDocument();
    expect(screen.getByText('15/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Còn 6 ngày')).toBeInTheDocument();

    expect(screen.getByText('HD-0002')).toBeInTheDocument();
    expect(screen.getByText('Hợp đồng Bảo trì')).toBeInTheDocument();
    expect(screen.getByText('28/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Còn 19 ngày')).toBeInTheDocument();
  });

  it('TC-02: hiển thị trạng thái rỗng khi không có hợp đồng nào sắp hết hạn', async () => {
    vi.mocked(contractsApi.fetchExpiringContracts).mockResolvedValue([]);

    render(
      <ContractExpiryReminderModal
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-05']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('expiry-empty-state')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Không có hợp đồng nào sắp hết hiệu lực trong vòng 30 ngày tới/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('expiring-contracts-table')).toBeNull();
  });

  it('TC-03: từ chối truy cập đối với vai trò không phải Kế toán (VT-05)', () => {
    render(
      <ContractExpiryReminderModal
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    expect(screen.getByText(/Chức năng yêu cầu vai trò Kế toán \(VT-05\)/i)).toBeInTheDocument();
    expect(contractsApi.fetchExpiringContracts).not.toHaveBeenCalled();
  });

  it('TC-04: cho phép đổi khung thời gian bằng nút preset hoặc nhập tùy chỉnh và chặn số âm', async () => {
    vi.mocked(contractsApi.fetchExpiringContracts).mockResolvedValue(mockExpiringContracts);

    render(
      <ContractExpiryReminderModal
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-05']}
      />
    );

    await waitFor(() => {
      expect(contractsApi.fetchExpiringContracts).toHaveBeenCalledWith(30);
    });

    // Bấm nút preset 15 ngày
    fireEvent.click(screen.getByRole('button', { name: '15 ngày' }));
    await waitFor(() => {
      expect(contractsApi.fetchExpiringContracts).toHaveBeenCalledWith(15);
    });

    // Nhập số ngày tùy chỉnh 45 ngày
    const input = screen.getByLabelText(/Số ngày rà soát/i);
    fireEvent.change(input, { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));

    await waitFor(() => {
      expect(contractsApi.fetchExpiringContracts).toHaveBeenCalledWith(45);
    });

    // Nhập số âm -> chặn client validation
    fireEvent.change(input, { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));

    await waitFor(() => {
      expect(screen.getByText(/Số ngày rà soát không được âm/i)).toBeInTheDocument();
    });
  });

  it('TC-05: hiển thị thông báo lỗi khi API backend thất bại', async () => {
    vi.mocked(contractsApi.fetchExpiringContracts).mockRejectedValue(
      new contractsApi.ContractsApiError('FORBIDDEN', 'Bạn không có quyền truy cập.', 403)
    );

    render(
      <ContractExpiryReminderModal
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-05']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bạn không có quyền truy cập.')).toBeInTheDocument();
    });
  });

  it('TC-06: gọi callback onClose khi nhấn nút Đóng', async () => {
    vi.mocked(contractsApi.fetchExpiringContracts).mockResolvedValue([]);
    const onClose = vi.fn();

    render(
      <ContractExpiryReminderModal
        isOpen
        onClose={onClose}
        currentUserRoles={['VT-05']}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Đóng')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Đóng'));
    expect(onClose).toHaveBeenCalled();
  });
});
