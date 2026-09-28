import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExpenseListPage from '../pages/ExpenseListPage';
import * as expensesApi from '../api/expensesApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
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
    createExpense: vi.fn(),
    updateRejectedExpense: vi.fn(),
    ExpensesApiError: MockExpensesApiError,
  };
});

vi.mock('../../projects/api/projectsApi', () => {
  class MockProjectsApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'ProjectsApiError';
    }
  }

  return {
    getProject: vi.fn(),
    ProjectsApiError: MockProjectsApiError,
  };
});

const RUNNING_PROJECT: ProjectRes = {
  id: 1,
  projectCode: 'PRJ-2026-001',
  name: 'Triển khai CRM cho Khách hàng Alpha',
  contractId: 10,
  customerId: 100,
  projectType: 'STANDARD',
  limitValue: null,
  startDate: '2026-05-01',
  expectedEndDate: '2026-12-31',
  projectManagerId: 5,
  status: 'RUNNING',
  createdAt: '2026-05-01T08:00:00',
};

const CLOSED_PROJECT: ProjectRes = { ...RUNNING_PROJECT, status: 'CLOSED' };

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

const REJECTED_OWN: ExpenseRes = {
  id: 42,
  projectId: 1,
  userId: 7,
  type: 'OTHER',
  amount: 300000,
  expenseDate: '2026-09-05',
  description: 'Chi phi phat sinh khac',
  receiptUrl: null,
  billable: false,
  status: 'REJECTED',
  createdAt: '2026-09-05T08:00:00',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: 'accountant',
  rejectedAt: '2026-09-06T08:00:00',
  rejectReason: 'Thieu chung tu hop le',
};

describe('ExpenseListPage (NCL-08-CN-001 — Ghi nhận chi phí phát sinh của dự án)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò không được xem chi phí dự án', () => {
    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-01']} />);
    expect(screen.getByTestId('expense-list-forbidden')).toBeInTheDocument();
    expect(expensesApi.getProjectExpenses).not.toHaveBeenCalled();
  });

  it('tải và hiển thị danh sách chi phí của dự án', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([APPROVED_NOT_BILLABLE, SUBMITTED]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('expense-row-40')).toHaveTextContent('Đi lại');
    expect(screen.getByTestId('expense-row-41')).toHaveTextContent('Công cụ, dụng cụ');
  });

  it('VT-03 không thấy nút đánh dấu tính cho KH', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([APPROVED_NOT_BILLABLE]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-03']} />);

    await screen.findByTestId('expense-row-40');
    expect(screen.queryByTestId('btn-toggle-billable-40')).not.toBeInTheDocument();
  });

  it('VT-02 đánh dấu phiếu đã duyệt tính lại cho khách hàng thành công', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
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
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([SUBMITTED]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);
    await screen.findByTestId('expense-row-41');

    expect(screen.queryByTestId('btn-toggle-billable-41')).not.toBeInTheDocument();
    expect(screen.getByTestId('billable-disabled-41')).toHaveTextContent('Chỉ áp dụng với phiếu đã duyệt');
    expect(expensesApi.updateExpenseBillable).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi từ backend khi bỏ đánh dấu phiếu đã nằm trong hóa đơn', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
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
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('expense-list-empty')).toBeInTheDocument();
  });

  it('hiển thị lỗi khi tải danh sách chi phí thất bại', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockRejectedValue(
      new expensesApi.ExpensesApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('expense-list-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });

  it('VT-05 xem được danh sách nhưng không thấy nút ghi nhận chi phí', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([APPROVED_NOT_BILLABLE]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-05']} />);

    await screen.findByTestId('expense-row-40');
    expect(screen.queryByTestId('btn-add-expense')).not.toBeInTheDocument();
  });

  it('vô hiệu hóa nút ghi nhận khi dự án đã đóng', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(CLOSED_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-03']} />);

    await screen.findByTestId('expense-list-empty');
    expect(screen.getByTestId('btn-add-expense')).toBeDisabled();
    expect(screen.getByTestId('expense-project-closed-alert')).toBeInTheDocument();
  });

  it('VT-03 ghi nhận chi phí mới thành công thì hiện toast và nạp lại danh sách', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValueOnce([]).mockResolvedValueOnce([APPROVED_NOT_BILLABLE]);
    vi.mocked(expensesApi.createExpense).mockResolvedValue({ ...APPROVED_NOT_BILLABLE, status: 'SUBMITTED' });

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-03']} currentUserId={7} />);
    await screen.findByTestId('expense-list-empty');

    fireEvent.click(screen.getByTestId('btn-add-expense'));
    fireEvent.change(screen.getByLabelText(/Loại chi phí/i), { target: { value: 'TRAVEL' } });
    fireEvent.change(screen.getByLabelText(/Số tiền/i), { target: { value: '2000000' } });
    fireEvent.change(screen.getByLabelText(/Ngày phát sinh/i), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText(/Mô tả/i), { target: { value: 'Chi phi di lai gap khach hang' } });
    fireEvent.click(screen.getByTestId('submit-expense-btn'));

    await waitFor(() =>
      expect(expensesApi.createExpense).toHaveBeenCalledWith(1, {
        type: 'TRAVEL',
        amount: 2000000,
        expenseDate: '2026-09-10',
        description: 'Chi phi di lai gap khach hang',
        receiptUrl: null,
      })
    );
    expect(await screen.findByTestId('expense-row-40')).toBeInTheDocument();
    expect(screen.getByText(/Đã ghi nhận phiếu chi phí #40 thành công/i)).toBeInTheDocument();
  });

  it('không cho submit khi bỏ trống các trường bắt buộc', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([]);

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-03']} />);
    await screen.findByTestId('expense-list-empty');

    fireEvent.click(screen.getByTestId('btn-add-expense'));
    fireEvent.click(screen.getByTestId('submit-expense-btn'));

    expect(await screen.findByTestId('error-expense-type')).toHaveTextContent('Loại chi phí không được để trống');
    expect(expensesApi.createExpense).not.toHaveBeenCalled();
  });

  it('chỉ chủ phiếu mới thấy nút "Sửa & nộp lại" trên phiếu bị từ chối của mình', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([REJECTED_OWN]);

    const { rerender } = render(<ExpenseListPage projectId={1} currentUserRoles={['VT-03']} currentUserId={999} />);
    await screen.findByTestId('expense-row-42');
    expect(screen.queryByTestId('btn-edit-expense-42')).not.toBeInTheDocument();

    rerender(<ExpenseListPage projectId={1} currentUserRoles={['VT-03']} currentUserId={7} />);
    expect(await screen.findByTestId('btn-edit-expense-42')).toBeInTheDocument();
    expect(screen.getByTestId('expense-row-42')).toHaveTextContent('Thieu chung tu hop le');
  });

  it('sửa & nộp lại phiếu bị từ chối thành công thì phiếu quay về SUBMITTED', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectExpenses).mockResolvedValue([REJECTED_OWN]);
    vi.mocked(expensesApi.updateRejectedExpense).mockResolvedValue({
      ...REJECTED_OWN,
      status: 'SUBMITTED',
      rejectedBy: null,
      rejectedAt: null,
      rejectReason: null,
      description: 'Da bo sung chung tu',
    });

    render(<ExpenseListPage projectId={1} currentUserRoles={['VT-03']} currentUserId={7} />);
    await screen.findByTestId('btn-edit-expense-42');

    fireEvent.click(screen.getByTestId('btn-edit-expense-42'));
    expect(screen.getByTestId('expense-form-reject-reason')).toHaveTextContent('Thieu chung tu hop le');

    fireEvent.change(screen.getByLabelText(/Mô tả/i), { target: { value: 'Da bo sung chung tu' } });
    fireEvent.click(screen.getByTestId('submit-expense-btn'));

    await waitFor(() =>
      expect(expensesApi.updateRejectedExpense).toHaveBeenCalledWith(42, {
        type: 'OTHER',
        amount: 300000,
        expenseDate: '2026-09-05',
        description: 'Da bo sung chung tu',
        receiptUrl: null,
      })
    );
    expect(await screen.findByText(/Đã nộp lại phiếu chi phí #42 thành công/i)).toBeInTheDocument();
  });
});
