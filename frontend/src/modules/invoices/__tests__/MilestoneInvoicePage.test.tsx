import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MilestoneInvoicePage from '../pages/MilestoneInvoicePage';
import * as invoicesApi from '../api/invoicesApi';
import * as contractsApi from '../../contracts/api/contractsApi';
import type { InvoiceRes } from '../types/invoiceTypes';
import type { ContractMilestoneRes, ContractRes } from '../../contracts/types/contractTypes';

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
    createInvoiceFromMilestone: vi.fn(),
    InvoicesApiError: MockInvoicesApiError,
  };
});

vi.mock('../../contracts/api/contractsApi', () => ({
  fetchContracts: vi.fn(),
  fetchMilestones: vi.fn(),
  ContractsApiError: class extends Error {
    constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
      super(message);
      this.name = 'ContractsApiError';
    }
  },
}));

const CONTRACTS: ContractRes[] = [
  { id: 5, contractCode: 'HD-005', name: 'Xay dung he thong CRM', opportunityId: null, customerId: 9, quoteId: null, contractType: 'FIXED_PRICE', totalValue: 1_000_000_000, status: 'ACTIVE' } as ContractRes,
  { id: 6, contractCode: 'HD-006', name: 'Bao tri he thong', opportunityId: null, customerId: 9, quoteId: null, contractType: 'MAINTENANCE', totalValue: 200_000_000, status: 'ACTIVE' } as ContractRes,
];

const MILESTONES: ContractMilestoneRes[] = [
  { id: 101, contractId: 5, name: 'Nghiem thu giai doan 1', percentage: 30, amount: 300_000_000, expectedDate: '2026-09-30', status: 'READY_TO_INVOICE' },
  { id: 102, contractId: 5, name: 'Nghiem thu giai doan 2', percentage: 30, amount: 300_000_000, expectedDate: '2026-11-30', status: 'PENDING' },
  { id: 103, contractId: 5, name: 'Nghiem thu giai doan 3', percentage: 40, amount: 400_000_000, expectedDate: '2026-12-31', status: 'INVOICED' },
];

const RESULT: InvoiceRes = {
  id: 100,
  invoiceCode: 'INV-20260921-A1B2C3',
  contractId: 5,
  milestoneId: 101,
  milestoneName: 'Nghiem thu giai doan 1',
  status: 'ISSUED',
  totalAmount: 300_000_000,
  invoiceDate: '2026-09-21',
  note: null,
  contractValue: 1_000_000_000,
  invoicedTotal: 300_000_000,
  createdBy: 'ketoan01',
  createdAt: '2026-09-21T10:00:00',
};

describe('MilestoneInvoicePage (NCL-10-CN-002 — Lập hóa đơn theo mốc hợp đồng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(contractsApi.fetchContracts).mockResolvedValue(CONTRACTS);
    vi.mocked(contractsApi.fetchMilestones).mockResolvedValue(MILESTONES);
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<MilestoneInvoicePage currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('milestone-invoice-access-denied')).toBeInTheDocument();
    expect(invoicesApi.createInvoiceFromMilestone).not.toHaveBeenCalled();
  });

  it('chỉ liệt kê hợp đồng trọn gói/theo mốc, không hiện hợp đồng duy trì', async () => {
    render(<MilestoneInvoicePage currentUserRoles={['VT-05']} />);

    const select = await screen.findByLabelText('Hợp đồng');
    expect(within(select).getByRole('option', { name: /HD-005/ })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: /HD-006/ })).toBeNull();
  });

  it('chọn hợp đồng thì tải đúng danh sách mốc, chỉ cho chọn mốc sẵn sàng xuất hóa đơn', async () => {
    render(<MilestoneInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });

    await waitFor(() => expect(contractsApi.fetchMilestones).toHaveBeenCalledWith(5));
    const table = await screen.findByTestId('milestone-invoice-table');
    expect(within(table).getByText('Nghiem thu giai doan 1')).toBeInTheDocument();

    const radios = within(table).getAllByRole('radio');
    expect(radios[0]).not.toBeDisabled(); // READY_TO_INVOICE
    expect(radios[1]).toBeDisabled(); // PENDING
    expect(radios[2]).toBeDisabled(); // INVOICED
  });

  it('không cho lập khi chưa chọn mốc', async () => {
    render(<MilestoneInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });
    await screen.findByTestId('milestone-invoice-table');
    fireEvent.click(screen.getByRole('button', { name: /Lập hóa đơn/i }));

    expect(await screen.findByText('Chọn mốc thanh toán cần lập hóa đơn')).toBeInTheDocument();
    expect(invoicesApi.createInvoiceFromMilestone).not.toHaveBeenCalled();
  });

  it('lập hóa đơn thành công thì hiện kết quả và mốc chuyển trạng thái', async () => {
    vi.mocked(invoicesApi.createInvoiceFromMilestone).mockResolvedValue(RESULT);

    render(<MilestoneInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });
    const table = await screen.findByTestId('milestone-invoice-table');
    fireEvent.click(within(table).getAllByRole('radio')[0]);
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Thanh toan dot 1' } });
    fireEvent.click(screen.getByRole('button', { name: /Lập hóa đơn/i }));

    await waitFor(() =>
      expect(invoicesApi.createInvoiceFromMilestone).toHaveBeenCalledWith(5, 101, {
        invoiceDate: null,
        note: 'Thanh toan dot 1',
      })
    );

    expect(await screen.findByTestId('milestone-invoice-result')).toBeInTheDocument();
    expect(screen.getByText('INV-20260921-A1B2C3')).toBeInTheDocument();
    expect(contractsApi.fetchMilestones).toHaveBeenCalledTimes(2); // tải lại sau khi lập thành công
  });

  it('hiển thị lỗi vượt giá trị hợp đồng (QTN-19) kèm gợi ý lập phụ lục', async () => {
    vi.mocked(invoicesApi.createInvoiceFromMilestone).mockRejectedValue(
      new invoicesApi.InvoicesApiError(
        'VALIDATION_ERROR',
        'Tong hoa don da lap cong hoa don moi vuot gia tri hop dong. Vui long lap phu luc dieu chinh hop dong truoc (QTN-19)',
        400
      )
    );

    render(<MilestoneInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });
    const table = await screen.findByTestId('milestone-invoice-table');
    fireEvent.click(within(table).getAllByRole('radio')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Lập hóa đơn/i }));

    expect(await screen.findByText(/vuot gia tri hop dong/i)).toBeInTheDocument();
    expect(screen.getByText(/lập phụ lục điều chỉnh/i)).toBeInTheDocument();
  });

  it('hiển thị lỗi mốc chưa nghiệm thu (INVALID_STATE)', async () => {
    vi.mocked(invoicesApi.createInvoiceFromMilestone).mockRejectedValue(
      new invoicesApi.InvoicesApiError('INVALID_STATE', 'Moc thanh toan chua du dieu kien lap hoa don (chua nghiem thu - QTN-25)', 400)
    );
    vi.mocked(contractsApi.fetchMilestones).mockResolvedValue([
      { id: 101, contractId: 5, name: 'Nghiem thu giai doan 1', percentage: 30, amount: 300_000_000, expectedDate: '2026-09-30', status: 'READY_TO_INVOICE' },
    ]);

    render(<MilestoneInvoicePage currentUserRoles={['VT-05']} />);

    fireEvent.change(await screen.findByLabelText('Hợp đồng'), { target: { value: '5' } });
    const table = await screen.findByTestId('milestone-invoice-table');
    fireEvent.click(within(table).getAllByRole('radio')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Lập hóa đơn/i }));

    expect(await screen.findByText(/chua nghiem thu/i)).toBeInTheDocument();
  });
});
