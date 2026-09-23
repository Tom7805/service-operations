import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvoiceFormModal from '../components/InvoiceFormModal';
import * as invoicesApi from '../api/invoicesApi';
import type { InvoiceRes } from '../types/invoiceTypes';

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

const RESULT: InvoiceRes = {
  id: 12,
  invoiceCode: 'INV-012',
  contractId: 5,
  milestoneId: 3,
  milestoneName: 'Tạm ứng khởi động',
  status: 'ISSUED',
  totalAmount: 100_000_000,
  invoiceDate: '2026-09-23',
  dueDate: '2026-10-23',
  note: null,
  contractValue: 500_000_000,
  invoicedTotal: 100_000_000,
  createdBy: 'ketoan01',
  createdAt: '2026-09-23T10:00:00',
};

describe('InvoiceFormModal (NCL-10-CN-002 — Lập hóa đơn theo mốc hợp đồng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(
      <InvoiceFormModal
        isOpen
        onClose={vi.fn()}
        contractId={5}
        milestoneId={3}
        milestoneName="Tạm ứng khởi động"
        currentUserRoles={['VT-02']}
      />
    );
    expect(screen.getByText(/yêu cầu vai trò Kế toán/i)).toBeInTheDocument();
    expect(invoicesApi.createInvoiceFromMilestone).not.toHaveBeenCalled();
  });

  it('hiển thị sẵn ngày hóa đơn hôm nay, hạn thanh toán +30 ngày và tên mốc', () => {
    render(
      <InvoiceFormModal
        isOpen
        onClose={vi.fn()}
        contractId={5}
        milestoneId={3}
        milestoneName="Tạm ứng khởi động"
        currentUserRoles={['VT-05']}
      />
    );

    const today = new Date().toISOString().slice(0, 10);
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const dueIso = due.toISOString().slice(0, 10);

    expect(screen.getByLabelText('Ngày hóa đơn')).toHaveValue(today);
    expect(screen.getByLabelText('Hạn thanh toán')).toHaveValue(dueIso);
    expect(screen.getByText(/Mốc: Tạm ứng khởi động/)).toBeInTheDocument();
  });

  it('lập hóa đơn thành công thì gọi onSaved và đóng modal', async () => {
    vi.mocked(invoicesApi.createInvoiceFromMilestone).mockResolvedValue(RESULT);
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <InvoiceFormModal
        isOpen
        onClose={onClose}
        onSaved={onSaved}
        contractId={5}
        milestoneId={3}
        currentUserRoles={['VT-05']}
      />
    );

    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Đợt 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lập hóa đơn' }));

    await waitFor(() =>
      expect(invoicesApi.createInvoiceFromMilestone).toHaveBeenCalledWith(
        5,
        3,
        expect.objectContaining({ note: 'Đợt 1' })
      )
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(RESULT));
    expect(onClose).toHaveBeenCalled();
  });

  it('hiển thị lỗi khi mốc chưa sẵn sàng xuất hóa đơn (INVALID_STATE)', async () => {
    vi.mocked(invoicesApi.createInvoiceFromMilestone).mockRejectedValue(
      new invoicesApi.InvoicesApiError('INVALID_STATE', 'Moc chua o trang thai san sang xuat hoa don', 400)
    );

    render(
      <InvoiceFormModal isOpen onClose={vi.fn()} contractId={5} milestoneId={3} currentUserRoles={['VT-05']} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lập hóa đơn' }));

    expect(await screen.findByText(/san sang xuat hoa don/i)).toBeInTheDocument();
  });

  it('bấm Hủy thì đóng modal mà không gọi API', () => {
    const onClose = vi.fn();
    render(
      <InvoiceFormModal isOpen onClose={onClose} contractId={5} milestoneId={3} currentUserRoles={['VT-05']} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));

    expect(onClose).toHaveBeenCalled();
    expect(invoicesApi.createInvoiceFromMilestone).not.toHaveBeenCalled();
  });
});
