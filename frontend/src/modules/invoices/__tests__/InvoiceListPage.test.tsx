import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvoiceListPage from '../pages/InvoiceListPage';
import * as invoicesApi from '../api/invoicesApi';
import type { InvoiceDetailRes } from '../types/invoiceTypes';

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
    fetchInvoicesPage: vi.fn(),
    InvoicesApiError: MockInvoicesApiError,
  };
});

const INVOICES: InvoiceDetailRes[] = [
  {
    id: 9,
    invoiceCode: 'INV-0001',
    contractId: 5,
    contractCode: 'HD-005',
    customerId: 1,
    customerName: 'Khach hang A',
    status: 'ISSUED',
    totalAmount: 100_000_000,
    paidAmount: 0,
    remainingAmount: 100_000_000,
    invoiceDate: '2026-09-01',
    dueDate: '2026-10-01',
    note: null,
  },
  {
    id: 10,
    invoiceCode: 'INV-0002',
    contractId: 6,
    contractCode: 'HD-006',
    customerId: 2,
    customerName: 'Khach hang B',
    status: 'PAID',
    totalAmount: 50_000_000,
    paidAmount: 50_000_000,
    remainingAmount: 0,
    invoiceDate: '2026-08-01',
    dueDate: '2026-09-01',
    note: null,
  },
];

/** Máy chủ giả cho GET /invoices/paged: lọc theo trạng thái/từ khoá như backend. */
function serveInvoices(all: InvoiceDetailRes[]) {
  vi.mocked(invoicesApi.fetchInvoicesPage).mockImplementation(async (query) => {
    const q = (query.keyword ?? '').toLowerCase();
    const content = all.filter(
      (inv) =>
        (!query.status || inv.status === query.status) &&
        (!q || [inv.invoiceCode, inv.contractCode, inv.customerName].some((v) => (v ?? '').toLowerCase().includes(q)))
    );
    return { content, page: 0, size: 20, totalElements: content.length, totalPages: content.length === 0 ? 0 : 1 };
  });
}

describe('InvoiceListPage (NCL-10-CN-003 — Ghi nhận thanh toán của khách hàng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serveInvoices(INVOICES);
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<InvoiceListPage currentUserRoles={['VT-02']} onOpenInvoice={vi.fn()} />);
    expect(screen.getByTestId('invoice-access-denied')).toBeInTheDocument();
    expect(invoicesApi.fetchInvoicesPage).not.toHaveBeenCalled();
  });

  it('tải và hiển thị danh sách hóa đơn', async () => {
    render(<InvoiceListPage currentUserRoles={['VT-05']} onOpenInvoice={vi.fn()} />);

    await waitFor(() => expect(invoicesApi.fetchInvoicesPage).toHaveBeenCalledWith({ keyword: '', status: '' }, 0, 20));
    const table = await screen.findByTestId('invoice-table');
    expect(table).toHaveTextContent('INV-0001');
    expect(table).toHaveTextContent('INV-0002');
  });

  it('lọc theo trạng thái chỉ còn hóa đơn khớp', async () => {
    render(<InvoiceListPage currentUserRoles={['VT-05']} onOpenInvoice={vi.fn()} />);

    await screen.findByTestId('invoice-table');
    fireEvent.change(screen.getByLabelText('Trạng thái:'), { target: { value: 'PAID' } });

    await waitFor(() => expect(screen.queryByText('INV-0001')).toBeNull());
    expect(screen.getByText('INV-0002')).toBeInTheDocument();
  });

  it('tìm kiếm theo mã hóa đơn/khách hàng chỉ còn dòng khớp', async () => {
    render(<InvoiceListPage currentUserRoles={['VT-05']} onOpenInvoice={vi.fn()} />);

    await screen.findByTestId('invoice-table');
    fireEvent.change(screen.getByLabelText('Tìm kiếm hóa đơn'), { target: { value: 'Khach hang B' } });

    // Tìm kiếm chạy ở máy chủ, gửi sau khi ngừng gõ.
    await waitFor(() => expect(screen.queryByText('INV-0001')).toBeNull());
    expect(invoicesApi.fetchInvoicesPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: 'Khach hang B' }),
      0,
      20
    );
    expect(screen.getByText('INV-0002')).toBeInTheDocument();
  });

  it('mở menu thao tác và bấm "Xem chi tiết" thì gọi onOpenInvoice đúng id', async () => {
    const onOpenInvoice = vi.fn();
    render(<InvoiceListPage currentUserRoles={['VT-05']} onOpenInvoice={onOpenInvoice} />);

    await screen.findByTestId('invoice-table');
    fireEvent.click(screen.getByRole('button', { name: 'Thao tác hóa đơn INV-0001' }));
    fireEvent.click(screen.getByTestId('invoice-action-view-9'));

    expect(onOpenInvoice).toHaveBeenCalledWith(9);
  });

  it('hiển thị trạng thái trống khi chưa có hóa đơn nào', async () => {
    serveInvoices([]);
    render(<InvoiceListPage currentUserRoles={['VT-05']} onOpenInvoice={vi.fn()} />);

    expect(await screen.findByTestId('invoice-empty')).toBeInTheDocument();
  });
});
