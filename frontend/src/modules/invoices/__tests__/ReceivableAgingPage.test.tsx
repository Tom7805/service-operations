import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReceivableAgingPage from '../pages/ReceivableAgingPage';
import * as invoicesApi from '../api/invoicesApi';
import type { AgingBucket, ReceivableAgingRes } from '../types/invoiceTypes';

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
    fetchReceivableAging: vi.fn(),
    InvoicesApiError: MockInvoicesApiError,
  };
});

const EMPTY_BUCKET = (bucket: AgingBucket, label: string, fromDays: number, toDays: number | null) => ({
  bucket,
  label,
  fromDays,
  toDays,
  invoiceCount: 0,
  remainingAmount: 0,
  invoices: [],
});

const RESULT_WITH_OVERDUE: ReceivableAgingRes = {
  asOfDate: '2026-09-21',
  totalInvoiceCount: 1,
  totalRemainingAmount: 60_000_000,
  buckets: [
    EMPTY_BUCKET('DAYS_1_30', 'Qua han 1-30 ngay', 1, 30),
    {
      bucket: 'DAYS_31_60',
      label: 'Qua han 31-60 ngay',
      fromDays: 31,
      toDays: 60,
      invoiceCount: 1,
      remainingAmount: 60_000_000,
      invoices: [
        {
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
          daysOverdue: 40,
        },
      ],
    },
    EMPTY_BUCKET('DAYS_61_90', 'Qua han 61-90 ngay', 61, 90),
    EMPTY_BUCKET('OVER_90', 'Qua han tren 90 ngay', 91, null),
  ],
};

const RESULT_NO_OVERDUE: ReceivableAgingRes = {
  asOfDate: '2026-09-21',
  totalInvoiceCount: 0,
  totalRemainingAmount: 0,
  buckets: [
    EMPTY_BUCKET('DAYS_1_30', 'Qua han 1-30 ngay', 1, 30),
    EMPTY_BUCKET('DAYS_31_60', 'Qua han 31-60 ngay', 31, 60),
    EMPTY_BUCKET('DAYS_61_90', 'Qua han 61-90 ngay', 61, 90),
    EMPTY_BUCKET('OVER_90', 'Qua han tren 90 ngay', 91, null),
  ],
};

describe('ReceivableAgingPage (NCL-10-CN-004 — Theo dõi công nợ quá hạn)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<ReceivableAgingPage currentUserRoles={['VT-02']} onOpenInvoice={vi.fn()} />);
    expect(screen.getByTestId('receivable-aging-access-denied')).toBeInTheDocument();
    expect(invoicesApi.fetchReceivableAging).not.toHaveBeenCalled();
  });

  it('hiển thị hóa đơn quá hạn đúng nhóm 31-60 ngày và các nhóm khác rỗng (TC-01)', async () => {
    vi.mocked(invoicesApi.fetchReceivableAging).mockResolvedValue(RESULT_WITH_OVERDUE);

    render(<ReceivableAgingPage currentUserRoles={['VT-05']} onOpenInvoice={vi.fn()} />);

    await waitFor(() => expect(invoicesApi.fetchReceivableAging).toHaveBeenCalled());
    const table = await screen.findByRole('table');
    expect(within(table).getByText('INV-20260713-A1B2C3')).toBeInTheDocument();
    expect(within(table).getByText('Cong ty A')).toBeInTheDocument();
    expect(within(table).getByText('40')).toBeInTheDocument();

    // Các nhóm khác vẫn hiện nhưng rỗng.
    expect(screen.getByTestId('aging-empty-DAYS_1_30')).toBeInTheDocument();
    expect(screen.getByTestId('aging-empty-DAYS_61_90')).toBeInTheDocument();
    expect(screen.getByTestId('aging-empty-OVER_90')).toBeInTheDocument();
  });

  it('không có công nợ quá hạn thì vẫn hiện đủ 4 nhóm rỗng (TC-02)', async () => {
    vi.mocked(invoicesApi.fetchReceivableAging).mockResolvedValue(RESULT_NO_OVERDUE);

    render(<ReceivableAgingPage currentUserRoles={['VT-05']} onOpenInvoice={vi.fn()} />);

    expect(await screen.findByTestId('aging-empty-DAYS_1_30')).toBeInTheDocument();
    expect(screen.getByTestId('aging-empty-DAYS_31_60')).toBeInTheDocument();
    expect(screen.getByTestId('aging-empty-DAYS_61_90')).toBeInTheDocument();
    expect(screen.getByTestId('aging-empty-OVER_90')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('bấm "Xem" gọi onOpenInvoice đúng id', async () => {
    vi.mocked(invoicesApi.fetchReceivableAging).mockResolvedValue(RESULT_WITH_OVERDUE);
    const onOpenInvoice = vi.fn();

    render(<ReceivableAgingPage currentUserRoles={['VT-05']} onOpenInvoice={onOpenInvoice} />);

    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Xem hóa đơn INV-20260713-A1B2C3' }));

    expect(onOpenInvoice).toHaveBeenCalledWith(9);
  });

  it('hiển thị lỗi và cho thử lại khi tải thất bại', async () => {
    vi.mocked(invoicesApi.fetchReceivableAging).mockRejectedValue(
      new invoicesApi.InvoicesApiError('UNKNOWN_ERROR', 'Khong tai duoc bao cao', 500)
    );

    render(<ReceivableAgingPage currentUserRoles={['VT-05']} onOpenInvoice={vi.fn()} />);

    expect(await screen.findByText('Khong tai duoc bao cao')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('bấm "Tải lại" thì gọi lại API', async () => {
    vi.mocked(invoicesApi.fetchReceivableAging).mockResolvedValue(RESULT_NO_OVERDUE);

    render(<ReceivableAgingPage currentUserRoles={['VT-05']} onOpenInvoice={vi.fn()} />);

    await screen.findByTestId('aging-empty-DAYS_1_30');
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại báo cáo tuổi nợ' }));

    await waitFor(() => expect(invoicesApi.fetchReceivableAging).toHaveBeenCalledTimes(2));
  });
});
