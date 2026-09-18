import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpenseApprovalPage from '../pages/ExpenseApprovalPage';
import * as expensesApi from '../api/expensesApi';
import type { ExpenseRes, SubcontractorExpenseRes } from '../types/expenseTypes';

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
    getPendingExpenses: vi.fn(),
    approveExpense: vi.fn(),
    rejectExpense: vi.fn(),
    getPendingSubcontractorExpenses: vi.fn(),
    approveSubcontractorExpense: vi.fn(),
    rejectSubcontractorExpense: vi.fn(),
    ExpensesApiError: MockExpensesApiError,
  };
});

const PENDING_1: ExpenseRes = {
  id: 30,
  projectId: 1,
  userId: 7,
  type: 'TRAVEL',
  amount: 2000000,
  expenseDate: '2026-09-10',
  description: 'Chi phi di lai gap khach hang',
  receiptUrl: 'https://files.example/receipt-1.pdf',
  billable: false,
  status: 'SUBMITTED',
  createdAt: '2026-09-10T08:00:00',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectReason: null,
};

const PENDING_2: ExpenseRes = {
  id: 31,
  projectId: 2,
  userId: 8,
  type: 'TOOLS',
  amount: 500000,
  expenseDate: '2026-09-11',
  description: 'Mua dung cu thi cong',
  receiptUrl: null,
  billable: false,
  status: 'SUBMITTED',
  createdAt: '2026-09-11T08:00:00',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectReason: null,
};

const PENDING_SUBCONTRACTOR_1: SubcontractorExpenseRes = {
  id: 50,
  projectId: 1,
  userId: 5,
  contractorName: 'Cong ty TNHH ABC',
  workScope: 'Trien khai module bao cao',
  amount: 50000000,
  incurredPeriod: '2026-09-01',
  status: 'SUBMITTED',
  createdAt: '2026-09-01T08:00:00',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectReason: null,
};

describe('ExpenseApprovalPage (NCL-08-CN-002 — Duyệt chi phí dự án)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(expensesApi.getPendingSubcontractorExpenses).mockResolvedValue([]);
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<ExpenseApprovalPage currentUserRoles={['VT-03']} />);
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(expensesApi.getPendingExpenses).not.toHaveBeenCalled();
  });

  it('tải và hiển thị danh sách phiếu chi phí đang chờ duyệt', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockResolvedValue([PENDING_1, PENDING_2]);

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);

    expect(await screen.findByTestId('pending-row-30')).toHaveTextContent('Đi lại');
    expect(screen.getByTestId('pending-row-31')).toHaveTextContent('Công cụ, dụng cụ');
  });

  it('hiển thị trạng thái trống khi không có phiếu nào chờ duyệt', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockResolvedValue([]);

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);

    expect(await screen.findByText(/Không có phiếu chi phí nào đang chờ duyệt/i)).toBeInTheDocument();
    expect(await screen.findByText(/Không có phiếu chi phí thuê ngoài nào đang chờ duyệt/i)).toBeInTheDocument();
  });

  it('hiển thị lỗi khi tải hàng chờ duyệt thất bại', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockRejectedValue(
      new expensesApi.ExpensesApiError('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.', 401)
    );

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);

    expect(await screen.findByText('Phiên đăng nhập đã hết hạn.')).toBeInTheDocument();
  });

  it('duyệt một phiếu thành công thì gỡ khỏi danh sách và hiện toast', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockResolvedValue([PENDING_1, PENDING_2]);
    vi.mocked(expensesApi.approveExpense).mockResolvedValue({
      ...PENDING_1,
      status: 'APPROVED',
      approvedBy: 'accountant',
      approvedAt: '2026-09-12T08:00:00',
    });

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('pending-row-30');

    fireEvent.click(screen.getByTestId('btn-approve-30'));
    fireEvent.click(screen.getByTestId('btn-confirm-approve'));

    await waitFor(() => expect(screen.queryByTestId('pending-row-30')).not.toBeInTheDocument());
    expect(screen.getByTestId('pending-row-31')).toBeInTheDocument();
    expect(expensesApi.approveExpense).toHaveBeenCalledWith(30);
    expect(screen.getByText(/Đã duyệt phiếu chi phí #30 thành công/i)).toBeInTheDocument();
  });

  it('từ chối một phiếu thành công thì gỡ khỏi danh sách và hiện toast', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockResolvedValue([PENDING_1]);
    vi.mocked(expensesApi.rejectExpense).mockResolvedValue({
      ...PENDING_1,
      status: 'REJECTED',
      rejectedBy: 'accountant',
      rejectedAt: '2026-09-12T08:00:00',
      rejectReason: 'Thieu chung tu',
    });

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('pending-row-30');

    fireEvent.click(screen.getByTestId('btn-reject-30'));
    fireEvent.change(screen.getByTestId('reject-reason-input'), { target: { value: 'Thieu chung tu' } });
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));

    await waitFor(() => expect(screen.queryByTestId('pending-row-30')).not.toBeInTheDocument());
    expect(expensesApi.rejectExpense).toHaveBeenCalledWith(30, { reason: 'Thieu chung tu' });
    expect(screen.getByText(/Đã từ chối phiếu chi phí #30/i)).toBeInTheDocument();
  });

  it('không cho xác nhận từ chối khi bỏ trống lý do', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockResolvedValue([PENDING_1]);

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('pending-row-30');

    fireEvent.click(screen.getByTestId('btn-reject-30'));
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));

    expect(await screen.findByText(/Lý do từ chối không được để trống/i)).toBeInTheDocument();
    expect(expensesApi.rejectExpense).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi khi duyệt thất bại nhưng vẫn giữ phiếu trong danh sách', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockResolvedValue([PENDING_1]);
    vi.mocked(expensesApi.approveExpense).mockRejectedValue(
      new expensesApi.ExpensesApiError('INVALID_STATE', 'Phieu chi phi khong o trang thai cho duyet', 400)
    );

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('pending-row-30');

    fireEvent.click(screen.getByTestId('btn-approve-30'));
    fireEvent.click(screen.getByTestId('btn-confirm-approve'));

    expect(await screen.findByText('Phieu chi phi khong o trang thai cho duyet')).toBeInTheDocument();
    expect(screen.getByTestId('pending-row-30')).toBeInTheDocument();
  });

  it('tải và hiển thị danh sách phiếu chi phí thuê ngoài đang chờ duyệt', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockResolvedValue([]);
    vi.mocked(expensesApi.getPendingSubcontractorExpenses).mockResolvedValue([PENDING_SUBCONTRACTOR_1]);

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);

    expect(await screen.findByTestId('pending-subcontractor-row-50')).toHaveTextContent('Cong ty TNHH ABC');
  });

  it('duyệt một phiếu chi phí thuê ngoài thành công thì gỡ khỏi danh sách và hiện toast', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockResolvedValue([]);
    vi.mocked(expensesApi.getPendingSubcontractorExpenses).mockResolvedValue([PENDING_SUBCONTRACTOR_1]);
    vi.mocked(expensesApi.approveSubcontractorExpense).mockResolvedValue({
      ...PENDING_SUBCONTRACTOR_1,
      status: 'APPROVED',
      approvedBy: 'accountant',
      approvedAt: '2026-09-12T08:00:00',
    });

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('pending-subcontractor-row-50');

    fireEvent.click(screen.getByTestId('btn-approve-subcontractor-50'));
    fireEvent.click(screen.getByTestId('btn-confirm-approve-subcontractor'));

    await waitFor(() => expect(screen.queryByTestId('pending-subcontractor-row-50')).not.toBeInTheDocument());
    expect(expensesApi.approveSubcontractorExpense).toHaveBeenCalledWith(50);
    expect(screen.getByText(/Đã duyệt phiếu chi phí thuê ngoài #50 thành công/i)).toBeInTheDocument();
  });

  it('từ chối một phiếu chi phí thuê ngoài bắt buộc nhập lý do', async () => {
    vi.mocked(expensesApi.getPendingExpenses).mockResolvedValue([]);
    vi.mocked(expensesApi.getPendingSubcontractorExpenses).mockResolvedValue([PENDING_SUBCONTRACTOR_1]);
    vi.mocked(expensesApi.rejectSubcontractorExpense).mockResolvedValue({
      ...PENDING_SUBCONTRACTOR_1,
      status: 'REJECTED',
      rejectedBy: 'accountant',
      rejectedAt: '2026-09-12T08:00:00',
      rejectReason: 'Thieu hop dong',
    });

    render(<ExpenseApprovalPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('pending-subcontractor-row-50');

    fireEvent.click(screen.getByTestId('btn-reject-subcontractor-50'));
    fireEvent.click(screen.getByTestId('btn-confirm-reject-subcontractor'));
    expect(await screen.findByText(/Lý do từ chối không được để trống/i)).toBeInTheDocument();
    expect(expensesApi.rejectSubcontractorExpense).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('reject-reason-subcontractor-input'), { target: { value: 'Thieu hop dong' } });
    fireEvent.click(screen.getByTestId('btn-confirm-reject-subcontractor'));

    await waitFor(() => expect(screen.queryByTestId('pending-subcontractor-row-50')).not.toBeInTheDocument());
    expect(expensesApi.rejectSubcontractorExpense).toHaveBeenCalledWith(50, { reason: 'Thieu hop dong' });
    expect(screen.getByText(/Đã từ chối phiếu chi phí thuê ngoài #50/i)).toBeInTheDocument();
  });
});
