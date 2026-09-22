import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentFormModal from '../components/PaymentFormModal';
import * as paymentsApi from '../api/paymentsApi';
import type { InvoiceDetailRes, PaymentRes } from '../types/invoiceTypes';

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
    createPayment: vi.fn(),
    PaymentsApiError: MockPaymentsApiError,
  };
});

const INVOICE: InvoiceDetailRes = {
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
};

const RESULT: PaymentRes = {
  id: 500,
  invoiceId: 9,
  invoiceCode: 'INV-TEST',
  amount: 60_000_000,
  paymentDate: '2026-09-20',
  method: 'BANK_TRANSFER',
  note: 'Dot 1',
  totalAmount: 100_000_000,
  paidAmount: 60_000_000,
  remainingAmount: 40_000_000,
  invoiceStatus: 'PARTIALLY_PAID',
  createdBy: 'ketoan01',
  createdAt: '2026-09-21T10:00:00',
};

describe('PaymentFormModal (NCL-10-CN-003 — Ghi nhận thanh toán của khách hàng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(
      <PaymentFormModal isOpen onClose={vi.fn()} invoice={INVOICE} currentUserRoles={['VT-02']} />
    );
    expect(screen.getByText(/yêu cầu vai trò Kế toán/i)).toBeInTheDocument();
    expect(paymentsApi.createPayment).not.toHaveBeenCalled();
  });

  it('không cho lưu khi số tiền vượt quá số còn lại', async () => {
    render(
      <PaymentFormModal isOpen onClose={vi.fn()} invoice={INVOICE} currentUserRoles={['VT-05']} />
    );

    fireEvent.change(screen.getByLabelText('Số tiền (VNĐ)'), { target: { value: '200000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận thanh toán' }));

    expect(await screen.findByText(/không được vượt quá số còn lại/i)).toBeInTheDocument();
    expect(paymentsApi.createPayment).not.toHaveBeenCalled();
  });

  it('ghi nhận thanh toán thành công thì gọi onSaved và đóng modal', async () => {
    vi.mocked(paymentsApi.createPayment).mockResolvedValue(RESULT);
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <PaymentFormModal isOpen onClose={onClose} onSaved={onSaved} invoice={INVOICE} currentUserRoles={['VT-05']} />
    );

    fireEvent.change(screen.getByLabelText('Số tiền (VNĐ)'), { target: { value: '60000000' } });
    fireEvent.change(screen.getByLabelText('Ngày thanh toán'), { target: { value: '2026-09-20' } });
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Dot 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận thanh toán' }));

    await waitFor(() =>
      expect(paymentsApi.createPayment).toHaveBeenCalledWith(9, {
        amount: 60_000_000,
        paymentDate: '2026-09-20',
        method: 'BANK_TRANSFER',
        note: 'Dot 1',
      })
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(RESULT));
    expect(onClose).toHaveBeenCalled();
  });

  it('hiển thị lỗi khi hóa đơn đã thanh toán đủ (INVALID_STATE)', async () => {
    vi.mocked(paymentsApi.createPayment).mockRejectedValue(
      new paymentsApi.PaymentsApiError('INVALID_STATE', 'Hoa don INV-TEST da duoc thanh toan du', 400)
    );

    render(
      <PaymentFormModal isOpen onClose={vi.fn()} invoice={INVOICE} currentUserRoles={['VT-05']} />
    );

    fireEvent.change(screen.getByLabelText('Số tiền (VNĐ)'), { target: { value: '10000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận thanh toán' }));

    expect(await screen.findByText(/da duoc thanh toan du/i)).toBeInTheDocument();
  });
});
