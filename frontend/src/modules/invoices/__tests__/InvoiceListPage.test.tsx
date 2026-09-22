import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvoiceListPage from '../pages/InvoiceListPage';
import * as invoicesApi from '../api/invoicesApi';
import * as paymentsApi from '../api/paymentsApi';
import type { InvoiceDetailRes, PaymentItemRes } from '../types/invoiceTypes';

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
    fetchInvoices: vi.fn(),
    getInvoice: vi.fn(),
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

const INVOICES: InvoiceDetailRes[] = [
  {
    id: 9,
    invoiceCode: 'INV-TEST',
    contractId: 5,
    contractCode: 'HD-005',
    customerId: 1,
    customerName: 'Khach hang A',
    status: 'ISSUED',
    totalAmount: 100_000_000,
    paidAmount: 0,
    remainingAmount: 100_000_000,
    invoiceDate: '2026-09-01',
    note: null,
  },
];

const PAYMENTS: PaymentItemRes[] = [
  { id: 500, amount: 60_000_000, paymentDate: '2026-09-20', method: 'BANK_TRANSFER', note: 'Dot 1', createdBy: 'ketoan01' },
];

describe('InvoiceListPage (NCL-10-CN-003 — Ghi nhận thanh toán của khách hàng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoicesApi.fetchInvoices).mockResolvedValue(INVOICES);
    vi.mocked(invoicesApi.getInvoice).mockResolvedValue(INVOICES[0]);
    vi.mocked(paymentsApi.fetchPayments).mockResolvedValue(PAYMENTS);
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<InvoiceListPage currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('invoice-list-access-denied')).toBeInTheDocument();
    expect(invoicesApi.fetchInvoices).not.toHaveBeenCalled();
  });

  it('tải và hiển thị danh sách hóa đơn', async () => {
    render(<InvoiceListPage currentUserRoles={['VT-05']} />);

    await waitFor(() => expect(invoicesApi.fetchInvoices).toHaveBeenCalledWith(undefined));
    const table = await screen.findByTestId('invoice-list-table');
    expect(table).toHaveTextContent('INV-TEST');
    expect(table).toHaveTextContent('Khach hang A');
  });

  it('lọc theo trạng thái gọi đúng tham số', async () => {
    render(<InvoiceListPage currentUserRoles={['VT-05']} />);

    await screen.findByTestId('invoice-list-table');
    fireEvent.click(screen.getByRole('tab', { name: 'Đã thanh toán đủ' }));

    await waitFor(() => expect(invoicesApi.fetchInvoices).toHaveBeenCalledWith(['PAID']));
  });

  it('mở chi tiết hóa đơn thì tải lịch sử thanh toán và cho ghi nhận thanh toán mới', async () => {
    render(<InvoiceListPage currentUserRoles={['VT-05']} />);

    await screen.findByTestId('invoice-list-table');
    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' }));

    await waitFor(() => expect(invoicesApi.getInvoice).toHaveBeenCalledWith(9));
    const paymentTable = await screen.findByTestId('payment-history-table');
    expect(paymentTable).toHaveTextContent('60.000.000');

    fireEvent.click(screen.getByRole('button', { name: /Ghi nhận thanh toán/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('quay lại danh sách từ trang chi tiết', async () => {
    render(<InvoiceListPage currentUserRoles={['VT-05']} />);

    await screen.findByTestId('invoice-list-table');
    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' }));
    await screen.findByTestId('payment-history-table');

    fireEvent.click(screen.getByRole('button', { name: /Quay lại danh sách/i }));
    expect(await screen.findByTestId('invoice-list-table')).toBeInTheDocument();
  });
});
