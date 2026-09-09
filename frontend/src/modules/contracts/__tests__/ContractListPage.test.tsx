import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContractListPage from '../pages/ContractListPage';
import * as contractsApi from '../api/contractsApi';
import type { ContractRes } from '../types/contractTypes';

vi.mock('../api/contractsApi', () => ({
  fetchContracts: vi.fn(),
  getContract: vi.fn(),
  activateContract: vi.fn(),
  fetchMilestones: vi.fn(),
  replaceMilestones: vi.fn(),
  updateMilestoneStatus: vi.fn(),
  updateTypeAndLimit: vi.fn(),
  getContractUsage: vi.fn(),
  fetchExpiringContracts: vi.fn(),
  ContractsApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'ContractsApiError';
    }
  },
}));

const contracts: ContractRes[] = [
  {
    id: 1,
    contractCode: 'HD-0001',
    name: 'Hợp đồng ERP Công ty ABC',
    opportunityId: 12,
    customerId: 10,
    customerName: 'Công ty TNHH ABC',
    quoteId: 30,
    contractType: 'FIXED_PRICE',
    totalValue: 500_000_000,
    limitValue: null,
    startDate: '2026-10-01',
    endDate: '2027-09-30',
    status: 'DRAFT',
  },
  {
    id: 2,
    contractCode: 'HD-0002',
    name: 'Hợp đồng Bảo trì Beta',
    opportunityId: 13,
    customerId: 11,
    customerName: 'Công ty CP Beta',
    quoteId: 31,
    contractType: 'MAINTENANCE',
    totalValue: 200_000_000,
    limitValue: 250_000_000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
  },
];

describe('ContractListPage (NCL-04-CN-002 — lối vào cho Kế toán)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-04: vai trò khác Kế toán bị từ chối, không gọi API danh sách hợp đồng', () => {
    render(<ContractListPage currentUserRoles={['VT-04']} currentUserName="Đỗ Thị Mai" />);

    expect(screen.getByTestId('contract-access-denied')).toBeInTheDocument();
    expect(contractsApi.fetchContracts).not.toHaveBeenCalled();
  });

  it('TC-01: Kế toán (VT-05) xem được danh sách hợp đồng và thao tác trên từng dòng', async () => {
    vi.mocked(contractsApi.fetchContracts).mockResolvedValue(contracts);

    render(<ContractListPage currentUserRoles={['VT-05']} currentUserName="Hoàng Văn Nam" />);

    expect(contractsApi.fetchContracts).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId('contract-table')).toBeInTheDocument();
    });

    expect(screen.getByText('HD-0001')).toBeInTheDocument();
    expect(screen.getByText('Công ty TNHH ABC')).toBeInTheDocument();
    // Mỗi dòng có nút khai báo loại & hạn mức + mốc thanh toán.
    expect(screen.getAllByRole('button', { name: /Khai báo loại & hạn mức/i })).toHaveLength(2);
    // Chỉ hợp đồng DRAFT mới có nút Kích hoạt.
    expect(screen.getAllByRole('button', { name: /^Kích hoạt$/i })).toHaveLength(1);
  });

  it('lọc theo trạng thái ACTIVE chỉ còn hợp đồng đang hiệu lực', async () => {
    vi.mocked(contractsApi.fetchContracts).mockResolvedValue(contracts);

    render(<ContractListPage currentUserRoles={['VT-05']} currentUserName="Hoàng Văn Nam" />);

    await waitFor(() => expect(screen.getByTestId('contract-table')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Trạng thái:'), { target: { value: 'ACTIVE' } });

    expect(screen.queryByText('HD-0001')).not.toBeInTheDocument();
    expect(screen.getByText('HD-0002')).toBeInTheDocument();
  });

  it('bấm "Khai báo loại & hạn mức" nạp chi tiết hợp đồng qua GET /contracts/{id} rồi mở modal', async () => {
    vi.mocked(contractsApi.fetchContracts).mockResolvedValue(contracts);
    vi.mocked(contractsApi.getContract).mockResolvedValue(contracts[0]);

    render(<ContractListPage currentUserRoles={['VT-05']} currentUserName="Hoàng Văn Nam" />);

    await waitFor(() => expect(screen.getByTestId('contract-table')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /Khai báo loại & hạn mức/i })[0]);

    await waitFor(() => {
      expect(contractsApi.getContract).toHaveBeenCalledWith(1);
    });
  });
});
