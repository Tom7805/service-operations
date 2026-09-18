import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpenseListPage from '../pages/ExpenseListPage';
import * as expensesApi from '../api/expensesApi';
import type { ExpenseRes } from '../types/expenseTypes';

vi.mock('../api/expensesApi', () => {
  class MockExpensesApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'ExpensesApiError';
    }
  }

  return {
    getProjectExpenses: vi.fn(),
    updateExpenseBillable: vi.fn(),
    ExpensesApiError: MockExpensesApiError,
  };
});

const APPROVED_NOT_BILLABLE: ExpenseRes = {
  id: 40,
  projectId: 1,
  userId: 7,
  type: 'TRAVEL',
  amount: 2000000,
  expenseDate: '2026-09-10',
  description: 'Chi phi di lai gap khach hang',
  receiptUrl: null,
  billable: false,
  status: 'APPROVED',
  createdAt: '2026-09-10T08:00:00',
  approvedBy: 'accountant',
  approvedAt: '2026-09-11T08:00:00',
  rejectedBy: null,
  rejectedAt: null,
  rejectReason: null,
};

const SUBMITTED: ExpenseRes = {
  id: 41,
  projectId: 1,
  userId: 8,
  type: 'TOOLS',
  amount: 500000,
  expenseDate: '2026-09-12',
  description: 'Mua dung cu thi cong',
  receiptUrl: null,
  billable: false,
  status: 'SUBMITTED',
  createdAt: '2026-09-12T08:00:00',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectReason: null,
};

describe('ExpenseListPage (NCL-08-CN-003 — Đánh dấu chi phí tính lại cho khách hàng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò không được xem chi phí dự án', () => {
    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-01']} />);
    expect(screen.getByTestId('expense-list-forbidden')).toBeInTheDocument();
    expect(expensesApi.getProjectExpenses).not.toHaveBeenCalled();
  });

  it('tải và hiển thị danh sách chi phí của dự án', async () => {
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([APPROVED_NOT_BILLABLE, SUBMITTED]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('expense-row-40')).toHaveTextContent('Đi lại');
    expect(screen.getByTestId('expense-row-41')).toHaveTextContent('Công cụ, dụng cụ');
  });

  it('VT-03 xem được danh sách nhưng không thấy nút đánh dấu tính cho KH', async () => {
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([APPROVED_NOT_BILLABLE]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-03']} />);

    await screen.findByTestId('expense-row-40');
    expect(screen.queryByTestId('btn-toggle-billable-40')).not.toBeInTheDocument();
  });

  it('VT-02 đánh dấu phiếu đã duyệt tính lại cho khách hàng thành công', async () => {
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([APPROVED_NOT_BILLABLE]);
    vi.mocked(expensesApi.updateExpenseBillable).mockResolvedValue({
      ...APPROVED_NOT_BILLABLE,
      billable: true,
    });

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);
    await screen.findByTestId('expense-row-40');

    fireEvent.click(screen.getByTestId('btn-toggle-billable-40'));

    await waitFor(() => expect(screen.getByTestId('expense-billable-40')).toHaveTextContent('Có'));
    expect(expensesApi.updateExpenseBillable).toHaveBeenCalledWith(40, { billable: true });
    expect(screen.getByText(/Đã đánh dấu phiếu #40 tính lại cho khách hàng/i)).toBeInTheDocument();
  });

  it('không thể đánh dấu phiếu chưa được duyệt (nút bị vô hiệu hóa)', async () => {
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([SUBMITTED]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);
    await screen.findByTestId('expense-row-41');

    expect(screen.queryByTestId('btn-toggle-billable-41')).not.toBeInTheDocument();
    expect(screen.getByTestId('billable-disabled-41')).toHaveTextContent('Chỉ áp dụng với phiếu đã duyệt');
    expect(expensesApi.updateExpenseBillable).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi từ backend khi bỏ đánh dấu phiếu đã nằm trong hóa đơn', async () => {
    const billableExpense = { ...APPROVED_NOT_BILLABLE, billable: true };
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([billableExpense]);
    vi.mocked(expensesApi.updateExpenseBillable).mockRejectedValue(
      new expensesApi.ExpensesApiError(
        'INVALID_STATE',
        'Chi phi da nam trong hoa don, khong the bo danh dau tinh lai cho khach hang',
        400
      )
    );

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);
    await screen.findByTestId('expense-row-40');

    fireEvent.click(screen.getByTestId('btn-toggle-billable-40'));

    expect(
      await screen.findByText('Chi phi da nam trong hoa don, khong the bo danh dau tinh lai cho khach hang')
    ).toBeInTheDocument();
    expect(screen.getByTestId('expense-billable-40')).toHaveTextContent('Có');
  });

  it('hiển thị trạng thái trống khi dự án chưa có chi phí nào', async () => {
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('expense-list-empty')).toBeInTheDocument();
  });

  it('hiển thị lỗi khi tải danh sách chi phí thất bại', async () => {
    vi.mocked(expensesApi.getProjectExpenses).mockRejectedValue(
      new expensesApi.ExpensesApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('expense-list-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });
});
