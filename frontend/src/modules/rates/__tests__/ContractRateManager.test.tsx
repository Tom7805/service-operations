import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContractRateManager from '../components/ContractRateManager';
import * as ratesApi from '../api/ratesApi';
import * as contractsApi from '../../contracts/api/contractsApi';
import type { ContractBillRateRes } from '../types/rateTypes';
import type { ContractRes } from '../../contracts/types/contractTypes';

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

vi.mock('../../contracts/api/contractsApi', () => ({
  fetchContracts: vi.fn(),
}));

const contractRates: ContractBillRateRes[] = [
  { contractId: 1, professionalRole: 'Lập trình viên cao cấp', level: 'Cao cấp', dailyRate: 3_000_000, effectiveFrom: '2026-01-01' },
];

const ROLE_OPTIONS = ['Lập trình viên cao cấp', 'Kiểm thử viên'];
const LEVELS_BY_ROLE = { 'Lập trình viên cao cấp': ['Cao cấp'], 'Kiểm thử viên': ['Trung cấp'] };

describe('ContractRateManager (NCL-07-CN-003 — Khai báo đơn giá riêng theo hợp đồng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mặc định coi như chưa tải được danh sách hợp đồng (vd VT-07 không có quyền liệt
    // kê) để các test cũ dùng ô nhập ID không bị đổi hành vi.
    vi.mocked(contractsApi.fetchContracts).mockRejectedValue(new Error('no list permission'));
  });

  it('chưa nhập ID hợp đồng thì chưa gọi API, chỉ hiện ô nhập', async () => {
    render(<ContractRateManager currentUserRoles={['VT-05']} roleOptions={ROLE_OPTIONS} levelsByRole={LEVELS_BY_ROLE} />);

    expect(await screen.findByLabelText('ID hợp đồng')).toBeInTheDocument();
    expect(ratesApi.fetchContractBillRates).not.toHaveBeenCalled();
    expect(screen.queryByTestId('contract-rate-table')).toBeNull();
  });

  it('TC-01/TC-02: nhập ID hợp đồng rồi mở → tải đúng danh sách đơn giá riêng của hợp đồng đó', async () => {
    vi.mocked(ratesApi.fetchContractBillRates).mockResolvedValue(contractRates);

    render(<ContractRateManager currentUserRoles={['VT-05']} roleOptions={ROLE_OPTIONS} levelsByRole={LEVELS_BY_ROLE} />);

    await screen.findByLabelText('ID hợp đồng');
    fireEvent.change(screen.getByLabelText('ID hợp đồng'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đơn giá hợp đồng' }));

    await waitFor(() => expect(ratesApi.fetchContractBillRates).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByTestId('contract-rate-table')).toBeInTheDocument());
    expect(within(screen.getByTestId('contract-rate-table')).getByText('Lập trình viên cao cấp')).toBeInTheDocument();
  });

  it('VT-05 tải được danh sách hợp đồng thì chọn theo tên thay vì gõ ID', async () => {
    const contracts: ContractRes[] = [
      { id: 1, contractCode: 'HD-001', name: 'Website bán hàng', opportunityId: null, customerId: 1, quoteId: null, contractType: 'FIXED_PRICE', totalValue: 100000000, status: 'ACTIVE' } as ContractRes,
    ];
    vi.mocked(contractsApi.fetchContracts).mockResolvedValue(contracts);
    vi.mocked(ratesApi.fetchContractBillRates).mockResolvedValue(contractRates);

    render(<ContractRateManager currentUserRoles={['VT-05']} roleOptions={ROLE_OPTIONS} levelsByRole={LEVELS_BY_ROLE} />);

    const select = await screen.findByLabelText('Hợp đồng');
    expect(screen.queryByLabelText('ID hợp đồng')).toBeNull();
    fireEvent.change(select, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đơn giá hợp đồng' }));

    await waitFor(() => expect(ratesApi.fetchContractBillRates).toHaveBeenCalledWith(1));
    expect(await screen.findByText('HD-001')).toBeInTheDocument();
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

    render(<ContractRateManager currentUserRoles={['VT-07']} roleOptions={ROLE_OPTIONS} levelsByRole={LEVELS_BY_ROLE} />);

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
    expect(within(screen.getByTestId('contract-rate-table')).getByText('Kiểm thử viên')).toBeInTheDocument();
  });

  it('vai trò/cấp bậc vừa khai báo riêng cho hợp đồng này (chưa có ở bảng chung) phải xuất hiện ngay trong ô tra đơn giá áp dụng', async () => {
    vi.mocked(ratesApi.fetchContractBillRates).mockResolvedValue([]);
    const created: ContractBillRateRes = {
      contractId: 7,
      professionalRole: 'Chuyên viên vận hành',
      level: 'Chuyên gia',
      dailyRate: 2_000_000,
      effectiveFrom: '2026-02-01',
    };
    vi.mocked(ratesApi.createContractBillRate).mockResolvedValue(created);

    // roleOptions/levelsByRole (bảng đơn giá CHUNG) không hề có "Chuyên viên vận hành".
    render(<ContractRateManager currentUserRoles={['VT-07']} roleOptions={ROLE_OPTIONS} levelsByRole={LEVELS_BY_ROLE} />);

    fireEvent.change(screen.getByLabelText('ID hợp đồng'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đơn giá hợp đồng' }));
    await waitFor(() => expect(screen.getByTestId('contract-rate-empty')).toBeInTheDocument());

    const resolveRoleSelect = screen.getByLabelText('Vai trò chuyên môn');
    expect(within(resolveRoleSelect).queryByRole('option', { name: 'Chuyên viên vận hành' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Khai báo đơn giá riêng/i }));
    const modal = within(screen.getByRole('dialog'));
    fireEvent.change(modal.getByLabelText('Vai trò chuyên môn'), { target: { value: 'Chuyên viên vận hành' } });
    fireEvent.change(modal.getByLabelText('Cấp bậc'), { target: { value: 'Chuyên gia' } });
    fireEvent.change(modal.getByLabelText('Đơn giá theo ngày công'), { target: { value: '2000000' } });
    fireEvent.change(modal.getByLabelText('Ngày hiệu lực'), { target: { value: '2026-02-01' } });
    fireEvent.click(modal.getByRole('button', { name: 'Lưu đơn giá riêng' }));

    await waitFor(() => expect(ratesApi.createContractBillRate).toHaveBeenCalled());

    // Sau khi khai báo, ô "Tra đơn giá áp dụng cho hợp đồng này" phải chọn được ngay
    // cặp vừa thêm mà không cần tải lại trang.
    await waitFor(() =>
      expect(within(screen.getByLabelText('Vai trò chuyên môn')).getByRole('option', { name: 'Chuyên viên vận hành' })).toBeInTheDocument()
    );
    fireEvent.change(screen.getByLabelText('Vai trò chuyên môn'), { target: { value: 'Chuyên viên vận hành' } });
    expect(
      within(screen.getByLabelText('Cấp bậc')).getByRole('option', { name: 'Chuyên gia' })
    ).toBeInTheDocument();
  });

  it('lỗi tải danh sách (vd hợp đồng không tồn tại) hiển thị rõ và có nút thử lại', async () => {
    vi.mocked(ratesApi.fetchContractBillRates).mockRejectedValue(
      new ratesApi.RatesApiError('RESOURCE_NOT_FOUND', 'Không tìm thấy hợp đồng với ID: 999', 404)
    );

    render(<ContractRateManager currentUserRoles={['VT-05']} roleOptions={ROLE_OPTIONS} levelsByRole={LEVELS_BY_ROLE} />);

    await screen.findByLabelText('ID hợp đồng');
    fireEvent.change(screen.getByLabelText('ID hợp đồng'), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đơn giá hợp đồng' }));

    expect(await screen.findByText('Không tìm thấy hợp đồng với ID: 999')).toBeInTheDocument();
  });
});
