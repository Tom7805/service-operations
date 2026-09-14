import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContractLimitAlert from '../components/ContractLimitAlert';
import * as contractsApi from '../api/contractsApi';
import type { ContractRes, ContractUsageRes } from '../types/contractTypes';

vi.mock('../api/contractsApi', () => ({
  getContractUsage: vi.fn(),
  fetchContractUsage: vi.fn(),
  ContractsApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'ContractsApiError';
    }
  },
}));

const sampleContract: ContractRes = {
  id: 5,
  contractCode: 'HD-4K7X2Q9',
  name: 'Hợp đồng triển khai ERP',
  opportunityId: 12,
  customerId: 1,
  customerName: 'Công ty TNHH ABC',
  quoteId: 30,
  contractType: 'MILESTONE',
  totalValue: 500_000_000,
  limitValue: 500_000_000,
  startDate: '2026-01-01',
  endDate: '2027-12-31',
  status: 'ACTIVE',
  notes: null,
  createdBy: 'pm01',
  createdAt: '2026-01-15T10:00:00',
};

describe('ContractLimitAlert (NCL-04-CN-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-01: cảnh báo khi sắp vượt hạn mức trần (đã dùng >= 80% hạn mức)', async () => {
    const usageData: ContractUsageRes = {
      contractId: 5,
      totalValue: 500_000_000,
      limitValue: 500_000_000,
      usedValue: 420_000_000,
      remainingValue: 80_000_000,
      usedPercentage: 84,
      nearLimit: true,
      overLimit: false,
    };
    vi.mocked(contractsApi.getContractUsage).mockResolvedValue(usageData);

    render(
      <ContractLimitAlert
        contract={sampleContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );

    expect(contractsApi.getContractUsage).toHaveBeenCalledWith(5);

    await waitFor(() => {
      expect(screen.getByTestId('limit-alert-near')).toBeInTheDocument();
    });

    expect(screen.getByText(/CẢNH BÁO: SẮP VƯỢT HẠN MỨC TRẦN!/i)).toBeInTheDocument();
    expect(screen.getAllByText(/84%/i).length).toBeGreaterThan(0);
    expect(screen.getByText('420.000.000 đ')).toBeInTheDocument();
    expect(screen.getByText('80.000.000 đ')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '84');
  });

  it('TC-02: cảnh báo khi đã vượt hạn mức trần (overLimit = true)', async () => {
    const usageData: ContractUsageRes = {
      contractId: 5,
      totalValue: 500_000_000,
      limitValue: 400_000_000,
      usedValue: 450_000_000,
      remainingValue: -50_000_000,
      usedPercentage: 113,
      nearLimit: false,
      overLimit: true,
    };
    vi.mocked(contractsApi.getContractUsage).mockResolvedValue(usageData);

    render(
      <ContractLimitAlert
        contract={sampleContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-05']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('limit-alert-over')).toBeInTheDocument();
    });

    expect(screen.getByText(/CẢNH BÁO: ĐÃ VƯỢT HẠN MỨC!/i)).toBeInTheDocument();
    expect(screen.getByText('-50.000.000 đ')).toBeInTheDocument();
    expect(screen.getAllByText(/113%/i).length).toBeGreaterThan(0);
  });

  it('TC-03: từ chối truy cập cho vai trò không phải Quản lý dự án (VT-02) hoặc Kế toán (VT-05)', () => {
    render(
      <ContractLimitAlert
        contract={sampleContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    expect(
      screen.getByText(/Chức năng yêu cầu vai trò Quản lý dự án \(VT-02\) hoặc Kế toán \(VT-05\)/i)
    ).toBeInTheDocument();
    expect(contractsApi.getContractUsage).not.toHaveBeenCalled();
  });

  it('cho phép cả Quản lý dự án (VT-02) và Kế toán (VT-05) truy cập', async () => {
    const usageData: ContractUsageRes = {
      contractId: 5,
      totalValue: 500_000_000,
      limitValue: 500_000_000,
      usedValue: 200_000_000,
      remainingValue: 300_000_000,
      usedPercentage: 40,
      nearLimit: false,
      overLimit: false,
    };
    vi.mocked(contractsApi.getContractUsage).mockResolvedValue(usageData);

    // Kiểm tra với VT-02
    const { unmount } = render(
      <ContractLimitAlert
        contract={sampleContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );
    await waitFor(() => {
      expect(contractsApi.getContractUsage).toHaveBeenCalledWith(5);
    });
    unmount();

    // Kiểm tra với VT-05
    render(
      <ContractLimitAlert
        contract={sampleContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-05']}
      />
    );
    await waitFor(() => {
      expect(contractsApi.getContractUsage).toHaveBeenCalledTimes(2);
    });
  });

  it('hiển thị thông báo an toàn khi hợp đồng không đặt hạn mức trần (limitValue = null)', async () => {
    const usageData: ContractUsageRes = {
      contractId: 5,
      totalValue: 500_000_000,
      limitValue: null,
      usedValue: 300_000_000,
      remainingValue: null,
      usedPercentage: null,
      nearLimit: false,
      overLimit: false,
    };
    vi.mocked(contractsApi.getContractUsage).mockResolvedValue(usageData);

    render(
      <ContractLimitAlert
        contract={sampleContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('limit-alert-no-limit')).toBeInTheDocument();
    });

    expect(screen.getByText(/Hợp đồng không đặt hạn mức/i)).toBeInTheDocument();
    expect(screen.getByText(/Chưa thiết lập/i)).toBeInTheDocument();
    expect(screen.queryByTestId('limit-alert-near')).toBeNull();
    expect(screen.queryByTestId('limit-alert-over')).toBeNull();
  });

  it('hiển thị trạng thái an toàn khi mức sử dụng dưới ngưỡng cảnh báo (< 80%)', async () => {
    const usageData: ContractUsageRes = {
      contractId: 5,
      totalValue: 500_000_000,
      limitValue: 500_000_000,
      usedValue: 100_000_000,
      remainingValue: 400_000_000,
      usedPercentage: 20,
      nearLimit: false,
      overLimit: false,
    };
    vi.mocked(contractsApi.getContractUsage).mockResolvedValue(usageData);

    render(
      <ContractLimitAlert
        contract={sampleContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('limit-alert-safe')).toBeInTheDocument();
    });

    expect(screen.getByText(/Mức sử dụng an toàn/i)).toBeInTheDocument();
    expect(screen.getAllByText(/20%/i).length).toBeGreaterThan(0);
  });

  it('hiển thị thông báo lỗi khi API backend thất bại', async () => {
    vi.mocked(contractsApi.getContractUsage).mockRejectedValue(
      new contractsApi.ContractsApiError('RESOURCE_NOT_FOUND', 'Không tìm thấy hợp đồng với id=5.', 404)
    );

    render(
      <ContractLimitAlert
        contract={sampleContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-02']}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy hợp đồng với id=5.')).toBeInTheDocument();
    });
  });

  it('gọi callback onClose khi người dùng nhấn nút Đóng', async () => {
    const usageData: ContractUsageRes = {
      contractId: 5,
      totalValue: 500_000_000,
      limitValue: 500_000_000,
      usedValue: 200_000_000,
      remainingValue: 300_000_000,
      usedPercentage: 40,
      nearLimit: false,
      overLimit: false,
    };
    vi.mocked(contractsApi.getContractUsage).mockResolvedValue(usageData);
    const onClose = vi.fn();

    render(
      <ContractLimitAlert
        contract={sampleContract}
        isOpen
        onClose={onClose}
        currentUserRoles={['VT-02']}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Đóng')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Đóng'));
    expect(onClose).toHaveBeenCalled();
  });
});
