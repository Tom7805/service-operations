import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import RenewalModal from '../components/RenewalModal';
import * as contractsApi from '../api/contractsApi';
import type { ContractRes, RenewalRes } from '../types/contractTypes';

vi.mock('../api/contractsApi', () => ({
  createRenewal: vi.fn(),
  fetchRenewals: vi.fn(),
  ContractsApiError: class extends Error {
    constructor(public code: string, message: string, public statusCode?: number) {
      super(message);
      this.name = 'ContractsApiError';
    }
  },
}));

const activeContract: ContractRes = {
  id: 5,
  contractCode: 'HD-2026-005',
  name: 'Hợp đồng dịch vụ bảo trì ERP',
  opportunityId: 10,
  customerId: 1,
  customerName: 'Tập đoàn Công nghệ ABC',
  quoteId: 12,
  contractType: 'MAINTENANCE',
  totalValue: 500_000_000,
  limitValue: 800_000_000,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'ACTIVE',
  notes: null,
  createdBy: 'sale01',
  createdAt: '2026-01-15T10:00:00',
};

const completedContract: ContractRes = {
  ...activeContract,
  id: 6,
  contractCode: 'HD-2026-006',
  status: 'COMPLETED',
};

const sampleRenewals: RenewalRes[] = [
  {
    id: 101,
    contractId: 5,
    previousEndDate: '2026-06-30',
    newEndDate: '2026-12-31',
    additionalValue: 100_000_000,
    valueBefore: 400_000_000,
    valueAfter: 500_000_000,
    notes: 'Khách hàng gia hạn thêm 6 tháng',
    createdBy: 'sale01',
    createdAt: '2026-06-15T14:30:00',
  },
];

describe('RenewalModal (NCL-04-CN-007 — Gia hạn hợp đồng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contractsApi.fetchRenewals).mockResolvedValue([]);
  });

  it('TC-01: Gia hạn hợp đồng ACTIVE thành công với ngày mới, giá trị bổ sung và ghi chú', async () => {
    vi.mocked(contractsApi.createRenewal).mockResolvedValue({
      id: 102,
      contractId: 5,
      previousEndDate: '2026-12-31',
      newEndDate: '2027-06-30',
      additionalValue: 100_000_000,
      valueBefore: 500_000_000,
      valueAfter: 600_000_000,
      notes: 'Khách hàng đồng ý tiếp tục thêm 6 tháng',
      createdBy: 'sale01',
      createdAt: '2026-12-01T09:00:00',
    });

    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <RenewalModal
        contract={activeContract}
        isOpen
        onClose={onClose}
        onSaved={onSaved}
        currentUserRoles={['VT-04']}
      />
    );

    // Điền form gia hạn
    fireEvent.change(screen.getByLabelText(/Ngày kết thúc mới/i), {
      target: { value: '2027-06-30' },
    });
    fireEvent.change(screen.getByLabelText(/Giá trị bổ sung/i), {
      target: { value: '100000000' },
    });
    fireEvent.change(screen.getByLabelText(/Ghi chú lý do gia hạn/i), {
      target: { value: 'Khách hàng đồng ý tiếp tục thêm 6 tháng' },
    });

    // Bấm nút gia hạn
    fireEvent.click(screen.getByTestId('btn-submit-renewal'));

    await waitFor(() => {
      expect(contractsApi.createRenewal).toHaveBeenCalledWith(5, {
        newEndDate: '2027-06-30',
        additionalValue: 100_000_000,
        notes: 'Khách hàng đồng ý tiếp tục thêm 6 tháng',
      });
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('TC-02: Từ chối gia hạn khi hợp đồng đã đóng (COMPLETED) và hiển thị hướng dẫn lập hợp đồng mới', async () => {
    render(
      <RenewalModal
        contract={completedContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('renewal-inactive-alert')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Chỉ gia hạn được hợp đồng đang còn hiệu lực \(ACTIVE\); hợp đồng đã đóng vui lòng lập hợp đồng mới/i)
    ).toBeInTheDocument();
    // Ẩn form nhập gia hạn
    expect(screen.queryByTestId('renewal-form')).toBeNull();
    expect(contractsApi.createRenewal).not.toHaveBeenCalled();
  });

  it('TC-03a: Báo lỗi khi ngày kết thúc mới không sau ngày kết thúc hiện tại hoặc để trống', async () => {
    render(
      <RenewalModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    // Thử submit khi để trống
    fireEvent.click(screen.getByTestId('btn-submit-renewal'));
    await waitFor(() => {
      expect(screen.getByText(/Ngày kết thúc mới không được để trống/i)).toBeInTheDocument();
    });

    // Thử nhập ngày kết thúc bằng hoặc trước ngày kết thúc hiện tại (2026-12-31)
    fireEvent.change(screen.getByLabelText(/Ngày kết thúc mới/i), {
      target: { value: '2026-12-31' },
    });
    fireEvent.click(screen.getByTestId('btn-submit-renewal'));

    await waitFor(() => {
      expect(
        screen.getByText(/Ngày kết thúc mới phải sau ngày kết thúc hiện tại của hợp đồng/i)
      ).toBeInTheDocument();
    });

    expect(contractsApi.createRenewal).not.toHaveBeenCalled();
  });

  it('TC-03b: Báo lỗi khi giá trị bổ sung là số âm', async () => {
    render(
      <RenewalModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    fireEvent.change(screen.getByLabelText(/Ngày kết thúc mới/i), {
      target: { value: '2027-06-30' },
    });
    fireEvent.change(screen.getByLabelText(/Giá trị bổ sung/i), {
      target: { value: '-50000000' },
    });

    fireEvent.click(screen.getByTestId('btn-submit-renewal'));

    await waitFor(() => {
      expect(screen.getByText(/Giá trị bổ sung không được âm/i)).toBeInTheDocument();
    });

    expect(contractsApi.createRenewal).not.toHaveBeenCalled();
  });

  it('TC-03c: Báo lỗi khi giá trị sau gia hạn vượt hạn mức trần (QTN-19)', async () => {
    // contract limitValue = 800_000_000, totalValue = 500_000_000. Thêm 350_000_000 -> 850_000_000 > 800_000_000
    render(
      <RenewalModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    fireEvent.change(screen.getByLabelText(/Ngày kết thúc mới/i), {
      target: { value: '2027-06-30' },
    });
    fireEvent.change(screen.getByLabelText(/Giá trị bổ sung/i), {
      target: { value: '350000000' },
    });

    fireEvent.click(screen.getByTestId('btn-submit-renewal'));

    await waitFor(() => {
      expect(screen.getByText(/vượt quá hạn mức cho phép/i)).toBeInTheDocument();
    });

    expect(contractsApi.createRenewal).not.toHaveBeenCalled();
  });

  it('TC-04a: Tải và hiển thị danh sách lịch sử các lần gia hạn trước đó', async () => {
    vi.mocked(contractsApi.fetchRenewals).mockResolvedValue(sampleRenewals);

    render(
      <RenewalModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    await waitFor(() => {
      expect(contractsApi.fetchRenewals).toHaveBeenCalledWith(5);
      expect(screen.getByTestId('renewal-history-table')).toBeInTheDocument();
      expect(screen.getByText('Khách hàng gia hạn thêm 6 tháng')).toBeInTheDocument();
      expect(screen.getByText(/Lịch sử gia hạn \(1\)/i)).toBeInTheDocument();
    });
  });

  it('TC-04b: Từ chối truy cập và chặn thao tác đối với người dùng không phải Nhân viên kinh doanh (VT-04)', () => {
    render(
      <RenewalModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-05']}
      />
    );

    expect(screen.getByText(/Yêu cầu vai trò Nhân viên kinh doanh \(VT-04\)/i)).toBeInTheDocument();
    expect(screen.queryByTestId('renewal-form')).toBeNull();
    expect(contractsApi.fetchRenewals).not.toHaveBeenCalled();
    expect(contractsApi.createRenewal).not.toHaveBeenCalled();
  });

  it('TC-05: Hiển thị thông báo lỗi từ backend khi gọi API thất bại', async () => {
    vi.mocked(contractsApi.createRenewal).mockRejectedValue(
      new contractsApi.ContractsApiError(
        'INVALID_STATE',
        'Chi gia han duoc hop dong dang con hieu luc (ACTIVE); hop dong da dong vui long lap hop dong moi',
        400
      )
    );

    render(
      <RenewalModal
        contract={activeContract}
        isOpen
        onClose={vi.fn()}
        currentUserRoles={['VT-04']}
      />
    );

    fireEvent.change(screen.getByLabelText(/Ngày kết thúc mới/i), {
      target: { value: '2027-06-30' },
    });

    fireEvent.click(screen.getByTestId('btn-submit-renewal'));

    await waitFor(() => {
      expect(screen.getByText(/Chi gia han duoc hop dong dang con hieu luc/i)).toBeInTheDocument();
    });
  });
});
