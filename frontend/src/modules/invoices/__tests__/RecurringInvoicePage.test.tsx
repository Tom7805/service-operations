import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecurringInvoicePage from '../pages/RecurringInvoicePage';
import * as invoicesApi from '../api/invoicesApi';
import * as contractsApi from '../../contracts/api/contractsApi';
import type { RecurringScheduleRes } from '../types/invoiceTypes';
import type { ContractRes } from '../../contracts/types/contractTypes';

vi.mock('../api/invoicesApi', () => {
  class MockInvoicesApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'InvoicesApiError';
    }
  }

  return {
    getRecurringSchedule: vi.fn(),
    createRecurringSchedule: vi.fn(),
    updateRecurringSchedule: vi.fn(),
    InvoicesApiError: MockInvoicesApiError,
  };
});

vi.mock('../../contracts/api/contractsApi', () => ({
  fetchContracts: vi.fn(),
}));

const CONTRACTS: ContractRes[] = [
  { id: 5, contractCode: 'HD-005', name: 'Bao tri he thong CRM', opportunityId: null, customerId: 9, quoteId: null, contractType: 'MAINTENANCE', totalValue: 0, status: 'ACTIVE' } as ContractRes,
];

const SCHEDULE: RecurringScheduleRes = {
  id: 1,
  contractId: 5,
  billingDayOfMonth: 5,
  amount: 10_000_000,
  active: true,
  lastGeneratedPeriod: '2026-08',
  notes: 'Ky hang thang',
};

describe('RecurringInvoicePage (NCL-10-CN-005 — Hóa đơn định kỳ cho hợp đồng duy trì)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contractsApi.fetchContracts).mockResolvedValue(CONTRACTS);
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<RecurringInvoicePage currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('recurring-invoice-access-denied')).toBeInTheDocument();
    expect(contractsApi.fetchContracts).not.toHaveBeenCalled();
  });

  it('chọn hợp đồng chưa có lịch thì báo tạo mới và không gọi API tạo/sửa khi chưa bấm lưu', async () => {
    vi.mocked(invoicesApi.getRecurringSchedule).mockRejectedValue(
      new invoicesApi.InvoicesApiError('RESOURCE_NOT_FOUND', 'Khong tim thay lich', 404)
    );

    render(<RecurringInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });

    await waitFor(() => expect(invoicesApi.getRecurringSchedule).toHaveBeenCalledWith(5));
    expect(await screen.findByText(/chưa có lịch hóa đơn định kỳ/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo lịch' })).toBeInTheDocument();
    expect(invoicesApi.createRecurringSchedule).not.toHaveBeenCalled();
  });

  it('không cho lưu khi bỏ trống ngày lập hóa đơn và số tiền', async () => {
    vi.mocked(invoicesApi.getRecurringSchedule).mockRejectedValue(
      new invoicesApi.InvoicesApiError('RESOURCE_NOT_FOUND', 'Khong tim thay lich', 404)
    );

    render(<RecurringInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });
    await screen.findByText(/chưa có lịch hóa đơn định kỳ/i);

    // Cả hai ô để trống (không vi phạm min/max gốc của <input type="number">, nên
    // submit gốc của trình duyệt không tự chặn trước khi validate JS chạy).
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    expect(await screen.findByText('Ngày lập hóa đơn hàng tháng không được để trống')).toBeInTheDocument();
    expect(screen.getByText('Số tiền không được để trống')).toBeInTheDocument();
    expect(invoicesApi.createRecurringSchedule).not.toHaveBeenCalled();
  });

  it('tạo lịch mới thành công thì gọi đúng payload và hiện toast', async () => {
    vi.mocked(invoicesApi.getRecurringSchedule).mockRejectedValue(
      new invoicesApi.InvoicesApiError('RESOURCE_NOT_FOUND', 'Khong tim thay lich', 404)
    );
    vi.mocked(invoicesApi.createRecurringSchedule).mockResolvedValue(SCHEDULE);

    render(<RecurringInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });
    await screen.findByText(/chưa có lịch hóa đơn định kỳ/i);

    fireEvent.change(screen.getByLabelText('Ngày lập hóa đơn hàng tháng'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Số tiền mỗi kỳ (VNĐ)'), { target: { value: '10000000' } });
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Ky hang thang' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    await waitFor(() =>
      expect(invoicesApi.createRecurringSchedule).toHaveBeenCalledWith(5, {
        billingDayOfMonth: 5,
        amount: 10_000_000,
        notes: 'Ky hang thang',
        active: true,
      })
    );
    expect(await screen.findByText('Đã lưu lịch hóa đơn định kỳ.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Cập nhật lịch' })).toBeInTheDocument();
  });

  it('chọn hợp đồng đã có lịch thì nạp sẵn form và nút đổi thành "Cập nhật lịch"', async () => {
    vi.mocked(invoicesApi.getRecurringSchedule).mockResolvedValue(SCHEDULE);

    render(<RecurringInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });

    expect(await screen.findByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10000000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ky hang thang')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cập nhật lịch' })).toBeInTheDocument();
  });

  it('cập nhật lịch hiện có thì gọi updateRecurringSchedule', async () => {
    vi.mocked(invoicesApi.getRecurringSchedule).mockResolvedValue(SCHEDULE);
    vi.mocked(invoicesApi.updateRecurringSchedule).mockResolvedValue({ ...SCHEDULE, amount: 12_000_000 });

    render(<RecurringInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });
    await screen.findByRole('button', { name: 'Cập nhật lịch' });

    fireEvent.change(screen.getByLabelText('Số tiền mỗi kỳ (VNĐ)'), { target: { value: '12000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật lịch' }));

    await waitFor(() =>
      expect(invoicesApi.updateRecurringSchedule).toHaveBeenCalledWith(5, {
        billingDayOfMonth: 5,
        amount: 12_000_000,
        notes: 'Ky hang thang',
        active: true,
      })
    );
    expect(invoicesApi.createRecurringSchedule).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi khi lưu thất bại', async () => {
    vi.mocked(invoicesApi.getRecurringSchedule).mockRejectedValue(
      new invoicesApi.InvoicesApiError('RESOURCE_NOT_FOUND', 'Khong tim thay lich', 404)
    );
    vi.mocked(invoicesApi.createRecurringSchedule).mockRejectedValue(
      new invoicesApi.InvoicesApiError('VALIDATION_ERROR', 'Hop dong khong phai loai duy tri', 400)
    );

    render(<RecurringInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });
    await screen.findByText(/chưa có lịch hóa đơn định kỳ/i);

    fireEvent.change(screen.getByLabelText('Ngày lập hóa đơn hàng tháng'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Số tiền mỗi kỳ (VNĐ)'), { target: { value: '10000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

    expect(await screen.findByText('Hop dong khong phai loai duy tri')).toBeInTheDocument();
  });
});
