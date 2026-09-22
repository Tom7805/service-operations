import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvoiceProposalPage from '../pages/InvoiceProposalPage';
import * as invoicesApi from '../api/invoicesApi';
import type { InvoiceProposalRes } from '../types/invoiceTypes';

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
    createInvoiceProposal: vi.fn(),
    InvoicesApiError: MockInvoicesApiError,
  };
});

const RESULT: InvoiceProposalRes = {
  id: 100,
  proposalCode: 'IP-20261001-A1B2C3',
  projectId: 1,
  contractId: 5,
  customerId: 9,
  periodFrom: '2026-09-01',
  periodTo: '2026-09-30',
  status: 'PENDING',
  laborAmount: 7200000,
  expenseAmount: 2000000,
  totalAmount: 9200000,
  note: 'Ky thang 9',
  laborLines: [
    {
      id: 1001,
      lineType: 'LABOR',
      timeEntryId: 11,
      projectExpenseId: null,
      lineDate: '2026-09-10',
      userId: 3,
      hours: 8,
      unitRate: 300000,
      description: 'Gio cong ngay 2026-09-10 - Phat trien API',
      amount: 2400000,
    },
  ],
  expenseLines: [
    {
      id: 1004,
      lineType: 'EXPENSE',
      timeEntryId: null,
      projectExpenseId: 50,
      lineDate: '2026-09-12',
      userId: null,
      hours: null,
      unitRate: null,
      description: 'Chi phi TRAVEL: Ve may bay cong tac',
      amount: 2000000,
    },
  ],
  skipped: {
    notApprovedCount: 5,
    nonBillableCount: 0,
    alreadyProposedCount: 0,
    missingRateCount: 0,
  },
  createdBy: 'ketoan01',
  createdAt: '2026-10-01T10:00:00',
};

describe('InvoiceProposalPage (NCL-10-CN-001 — Tạo đề nghị xuất hóa đơn từ giờ công đã duyệt)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<InvoiceProposalPage currentUserRoles={['VT-02']} />);
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(invoicesApi.createInvoiceProposal).not.toHaveBeenCalled();
  });

  it('hiển thị trạng thái trống khi chưa tạo đề nghị nào trong phiên', () => {
    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);
    expect(screen.getByTestId('invoice-proposal-empty')).toBeInTheDocument();
  });

  it('không cho tạo khi bỏ trống mã dự án và kỳ', async () => {
    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    fireEvent.click(screen.getByTestId('btn-create-invoice-proposal'));

    expect(await screen.findByTestId('error-proposal-project-id')).toHaveTextContent('Mã dự án không được để trống');
    expect(screen.getByTestId('error-proposal-period-from')).toHaveTextContent('Ngày bắt đầu kỳ không được để trống');
    expect(screen.getByTestId('error-proposal-period-to')).toHaveTextContent('Ngày kết thúc kỳ không được để trống');
    expect(invoicesApi.createInvoiceProposal).not.toHaveBeenCalled();
  });

  it('không cho tạo khi ngày kết thúc kỳ trước ngày bắt đầu', async () => {
    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    fireEvent.change(screen.getByTestId('proposal-project-id-input'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('proposal-period-from-input'), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByTestId('proposal-period-to-input'), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByTestId('btn-create-invoice-proposal'));

    expect(await screen.findByTestId('error-proposal-period-to')).toHaveTextContent(
      'Ngày kết thúc kỳ không được trước ngày bắt đầu kỳ'
    );
    expect(invoicesApi.createInvoiceProposal).not.toHaveBeenCalled();
  });

  it('tạo đề nghị thành công thì hiện kết quả, cảnh báo bỏ qua và toast', async () => {
    vi.mocked(invoicesApi.createInvoiceProposal).mockResolvedValue(RESULT);

    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    fireEvent.change(screen.getByTestId('proposal-project-id-input'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('proposal-period-from-input'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByTestId('proposal-period-to-input'), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByTestId('proposal-note-input'), { target: { value: 'Ky thang 9' } });
    fireEvent.click(screen.getByTestId('btn-create-invoice-proposal'));

    await waitFor(() =>
      expect(invoicesApi.createInvoiceProposal).toHaveBeenCalledWith(1, {
        periodFrom: '2026-09-01',
        periodTo: '2026-09-30',
        note: 'Ky thang 9',
      })
    );

    expect(await screen.findByTestId('invoice-proposal-result-100')).toBeInTheDocument();
    expect(screen.getByText('IP-20261001-A1B2C3')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-proposal-skipped-100')).toHaveTextContent('Đã bỏ qua 5 dòng giờ công');
    expect(screen.getByTestId('invoice-proposal-labor-line-100-1001')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-proposal-expense-line-100-1004')).toBeInTheDocument();
    expect(screen.getByText(/Đã tạo đề nghị IP-20261001-A1B2C3/i)).toBeInTheDocument();
  });

  it('hiển thị lỗi khi hợp đồng không phải theo giờ hoặc kỳ không có dòng đủ điều kiện (INVALID_STATE)', async () => {
    vi.mocked(invoicesApi.createInvoiceProposal).mockRejectedValue(
      new invoicesApi.InvoicesApiError(
        'INVALID_STATE',
        'Ky khong co dong gio cong/phi phi nao du dieu kien de tao de nghi',
        400
      )
    );

    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    fireEvent.change(screen.getByTestId('proposal-project-id-input'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('proposal-period-from-input'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByTestId('proposal-period-to-input'), { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByTestId('btn-create-invoice-proposal'));

    expect(
      await screen.findByText('Ky khong co dong gio cong/phi phi nao du dieu kien de tao de nghi')
    ).toBeInTheDocument();
    expect(screen.getByTestId('invoice-proposal-empty')).toBeInTheDocument();
  });

  it('hiển thị lỗi 404 khi không tìm thấy dự án', async () => {
    vi.mocked(invoicesApi.createInvoiceProposal).mockRejectedValue(
      new invoicesApi.InvoicesApiError('RESOURCE_NOT_FOUND', 'Khong tim thay du an', 404)
    );

    render(<InvoiceProposalPage currentUserRoles={['VT-05']} />);

    fireEvent.change(screen.getByTestId('proposal-project-id-input'), { target: { value: '999' } });
    fireEvent.change(screen.getByTestId('proposal-period-from-input'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByTestId('proposal-period-to-input'), { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByTestId('btn-create-invoice-proposal'));

    expect(await screen.findByText('Khong tim thay du an')).toBeInTheDocument();
  });
});
