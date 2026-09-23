import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvoiceDetailPage from '../pages/InvoiceDetailPage';
import * as invoicesApi from '../api/invoicesApi';
import * as paymentsApi from '../api/paymentsApi';
import type { DunningLogRes, InvoiceDetailRes, PaymentItemRes } from '../types/invoiceTypes';

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
    getInvoice: vi.fn(),
    fetchDunningLogs: vi.fn(),
    InvoicesApiError: MockInvoicesApiError,
  };
});

vi.mock('../api/paymentsApi', () => {
  class MockPaymentsApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'PaymentsApiError';
    }
  }

  return {
    fetchPayments: vi.fn(),
    createPayment: vi.fn(),
    PaymentsApiError: MockPaymentsApiError,
  };
});

const INVOICE_ISSUED: InvoiceDetailRes = {
  id: 9,
  invoiceCode: 'INV-20260713-A1B2C3',
  contractId: 5,
  contractCode: 'HD-LK3F9A',
  customerId: 3,
  customerName: 'Cong ty A',
  status: 'PARTIALLY_PAID',
  totalAmount: 100_000_000,
  paidAmount: 40_000_000,
  remainingAmount: 60_000_000,
  invoiceDate: '2026-07-13',
  dueDate: '2026-08-12',
  note: null,
};

const PAYMENTS: PaymentItemRes[] = [
  { id: 501, amount: 40_000_000, paymentDate: '2026-07-20', method: 'CASH', note: null, createdBy: 'ketoan01' },
];

const DUNNING_LOGS: DunningLogRes[] = [
  {
    id: 1,
    invoiceId: 9,
    stage: 'OVERDUE',
    referenceDate: '2026-08-19',
    daysOverdue: 7,
    remainingAmount: 60_000_000,
    recipientIds: [1, 2],
    sentAt: '2026-08-19T07:00:00',
  },
  {
    id: 2,
    invoiceId: 9,
    stage: 'DUE_TODAY',
    referenceDate: '2026-08-12',
    daysOverdue: 0,
    remainingAmount: 60_000_000,
    recipientIds: [1, 2],
    sentAt: '2026-08-12T07:00:00',
  },
];

describe('InvoiceDetailPage (NCL-10-CN-006 — Nhắc thu nợ tự động)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoicesApi.getInvoice).mockResolvedValue(INVOICE_ISSUED);
    vi.mocked(paymentsApi.fetchPayments).mockResolvedValue(PAYMENTS);
    vi.mocked(invoicesApi.fetchDunningLogs).mockResolvedValue(DUNNING_LOGS);
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<InvoiceDetailPage invoiceId={9} onBack={vi.fn()} currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('invoice-detail-access-denied')).toBeInTheDocument();
    expect(invoicesApi.getInvoice).not.toHaveBeenCalled();
  });

  it('tải và hiển thị lịch sử nhắc thu nợ, mới nhất trước', async () => {
    render(<InvoiceDetailPage invoiceId={9} onBack={vi.fn()} currentUserRoles={['VT-05']} />);

    await waitFor(() => expect(invoicesApi.fetchDunningLogs).toHaveBeenCalledWith(9));
    expect(await screen.findByText('Lịch sử nhắc thu nợ')).toBeInTheDocument();
    expect(screen.getByText('Quá hạn')).toBeInTheDocument();
    expect(screen.getByText('Đến hạn hôm nay')).toBeInTheDocument();

    const tables = screen.getAllByRole('table');
    const dunningTable = tables[tables.length - 1]; // bảng thanh toán đứng trước, bảng nhắc nợ đứng sau
    const rows = within(dunningTable).getAllByRole('row');
    // Dòng đầu tiên (sau header) phải là mốc quá hạn (sentAt 19/08) — mới nhất trước.
    expect(within(rows[1]).getByText('Quá hạn')).toBeInTheDocument();
  });

  it('hiển thị trạng thái trống khi hóa đơn chưa từng bị nhắc thu nợ', async () => {
    vi.mocked(invoicesApi.fetchDunningLogs).mockResolvedValue([]);

    render(<InvoiceDetailPage invoiceId={9} onBack={vi.fn()} currentUserRoles={['VT-05']} />);

    expect(await screen.findByTestId('dunning-empty')).toBeInTheDocument();
    expect(screen.getByText('Chưa có nhắc thu nợ nào cho hóa đơn này')).toBeInTheDocument();
  });

  it('hiển thị đủ thông tin hóa đơn và lịch sử thanh toán cùng lúc', async () => {
    render(<InvoiceDetailPage invoiceId={9} onBack={vi.fn()} currentUserRoles={['VT-05']} />);

    expect(await screen.findByText('INV-20260713-A1B2C3')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'HD-LK3F9A · Cong ty A')).toBeInTheDocument();
    expect(screen.getByText('Lịch sử thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Tiền mặt')).toBeInTheDocument();
  });

  it('ghi nhận thanh toán mới thì cập nhật số dư và nạp lại không cần gọi lại getInvoice', async () => {
    vi.mocked(paymentsApi.createPayment).mockResolvedValue({
      id: 999,
      invoiceId: 9,
      invoiceCode: 'INV-20260713-A1B2C3',
      amount: 60_000_000,
      paymentDate: '2026-09-01',
      method: 'BANK_TRANSFER',
      note: null,
      totalAmount: 100_000_000,
      paidAmount: 100_000_000,
      remainingAmount: 0,
      invoiceStatus: 'PAID',
      createdBy: 'ketoan01',
      createdAt: '2026-09-01T10:00:00',
    });

    render(<InvoiceDetailPage invoiceId={9} onBack={vi.fn()} currentUserRoles={['VT-05']} />);

    fireEvent.click(await screen.findByRole('button', { name: /Ghi nhận thanh toán/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Số tiền (VNĐ)'), { target: { value: '60000000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ghi nhận thanh toán' }));

    await waitFor(() => expect(paymentsApi.createPayment).toHaveBeenCalledWith(9, expect.objectContaining({ amount: 60_000_000 })));
    expect(invoicesApi.getInvoice).toHaveBeenCalledTimes(1); // không gọi lại — dùng số dư trả về từ createPayment
    expect(await screen.findByText(/Đã ghi nhận thanh toán/i)).toBeInTheDocument();
  });

  it('nút "Ghi nhận thanh toán" ẩn khi hóa đơn đã thanh toán đủ', async () => {
    vi.mocked(invoicesApi.getInvoice).mockResolvedValue({ ...INVOICE_ISSUED, status: 'PAID', remainingAmount: 0 });

    render(<InvoiceDetailPage invoiceId={9} onBack={vi.fn()} currentUserRoles={['VT-05']} />);

    await screen.findByText('INV-20260713-A1B2C3');
    expect(screen.queryByRole('button', { name: /Ghi nhận thanh toán/i })).toBeNull();
  });

  it('bấm quay lại thì gọi onBack', async () => {
    const onBack = vi.fn();
    render(<InvoiceDetailPage invoiceId={9} onBack={onBack} currentUserRoles={['VT-05']} />);

    await screen.findByText('INV-20260713-A1B2C3');
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại danh sách hóa đơn' }));

    expect(onBack).toHaveBeenCalled();
  });

  it('hiển thị lỗi và cho thử lại khi tải thất bại', async () => {
    vi.mocked(invoicesApi.getInvoice).mockRejectedValue(
      new invoicesApi.InvoicesApiError('RESOURCE_NOT_FOUND', 'Khong tim thay hoa don', 404)
    );

    render(<InvoiceDetailPage invoiceId={9} onBack={vi.fn()} currentUserRoles={['VT-05']} />);

    expect(await screen.findByText('Khong tim thay hoa don')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
