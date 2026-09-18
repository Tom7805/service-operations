import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubcontractorExpenseListPage from '../pages/SubcontractorExpenseListPage';
import * as expensesApi from '../api/expensesApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { SubcontractorExpenseRes } from '../types/expenseTypes';

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
    getProjectSubcontractorExpenses: vi.fn(),
    createSubcontractorExpense: vi.fn(),
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

const EXPENSE_1: SubcontractorExpenseRes = {
  id: 50,
  projectId: 1,
  userId: 5,
  contractorName: 'Công ty TNHH Xây dựng ABC',
  workScope: 'Thi công phần điện nước',
  amount: 15000000,
  incurredPeriod: '2026-06-01',
  status: 'SUBMITTED',
  createdAt: '2026-06-01T08:00:00',
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectReason: null,
};

describe('SubcontractorExpenseListPage (NCL-08-CN-004 — Ghi nhận chi phí thuê ngoài)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò không được xem chi phí thuê ngoài', () => {
    render(<SubcontractorExpenseListPage projectId={1} currentUserRoles={['VT-03']} />);
    expect(screen.getByTestId('subcontractor-expense-forbidden')).toBeInTheDocument();
    expect(expensesApi.getProjectSubcontractorExpenses).not.toHaveBeenCalled();
  });

  it('tải và hiển thị danh sách chi phí thuê ngoài của dự án', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectSubcontractorExpenses).mockResolvedValue([EXPENSE_1]);

    render(<SubcontractorExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('subcontractor-expense-row-50')).toHaveTextContent(
      'Công ty TNHH Xây dựng ABC'
    );
  });

  it('hiển thị trạng thái trống khi dự án chưa có chi phí thuê ngoài nào', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectSubcontractorExpenses).mockResolvedValue([]);

    render(<SubcontractorExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('subcontractor-expense-empty')).toBeInTheDocument();
  });

  it('VT-05 xem được danh sách nhưng không thấy nút ghi nhận', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectSubcontractorExpenses).mockResolvedValue([EXPENSE_1]);

    render(<SubcontractorExpenseListPage projectId={1} currentUserRoles={['VT-05']} />);

    await screen.findByTestId('subcontractor-expense-row-50');
    expect(screen.queryByTestId('btn-add-subcontractor-expense')).not.toBeInTheDocument();
  });

  it('vô hiệu hóa nút ghi nhận khi dự án đã đóng', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(CLOSED_PROJECT);
    vi.mocked(expensesApi.getProjectSubcontractorExpenses).mockResolvedValue([]);

    render(<SubcontractorExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    await screen.findByTestId('subcontractor-expense-empty');
    expect(screen.getByTestId('btn-add-subcontractor-expense')).toBeDisabled();
    expect(screen.getByTestId('subcontractor-expense-project-closed-alert')).toBeInTheDocument();
  });

  it('ghi nhận chi phí thuê ngoài thành công thì hiện toast và nạp lại danh sách', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectSubcontractorExpenses).mockResolvedValueOnce([]).mockResolvedValueOnce([EXPENSE_1]);
    vi.mocked(expensesApi.createSubcontractorExpense).mockResolvedValue(EXPENSE_1);

    render(<SubcontractorExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);
    await screen.findByTestId('subcontractor-expense-empty');

    fireEvent.click(screen.getByTestId('btn-add-subcontractor-expense'));
    fireEvent.change(screen.getByLabelText(/Nhà thầu/i), { target: { value: 'Công ty TNHH Xây dựng ABC' } });
    fireEvent.change(screen.getByLabelText(/Phạm vi công việc/i), { target: { value: 'Thi công phần điện nước' } });
    fireEvent.change(screen.getByLabelText(/Số tiền/i), { target: { value: '15000000' } });
    fireEvent.change(screen.getByLabelText(/Kỳ phát sinh/i), { target: { value: '2026-06-01' } });
    fireEvent.click(screen.getByTestId('submit-subcontractor-expense-btn'));

    await waitFor(() =>
      expect(expensesApi.createSubcontractorExpense).toHaveBeenCalledWith(1, {
        contractorName: 'Công ty TNHH Xây dựng ABC',
        workScope: 'Thi công phần điện nước',
        amount: 15000000,
        incurredPeriod: '2026-06-01',
      })
    );
    expect(await screen.findByTestId('subcontractor-expense-row-50')).toBeInTheDocument();
    expect(screen.getByText(/Đã ghi nhận chi phí thuê ngoài/i)).toBeInTheDocument();
  });

  it('không cho submit khi bỏ trống các trường bắt buộc', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectSubcontractorExpenses).mockResolvedValue([]);

    render(<SubcontractorExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);
    await screen.findByTestId('subcontractor-expense-empty');

    fireEvent.click(screen.getByTestId('btn-add-subcontractor-expense'));
    fireEvent.click(screen.getByTestId('submit-subcontractor-expense-btn'));

    expect(await screen.findByTestId('error-contractor-name')).toHaveTextContent('Nhà thầu không được để trống');
    expect(expensesApi.createSubcontractorExpense).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi từ backend khi ghi nhận thất bại (vd. dự án đã đóng)', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectSubcontractorExpenses).mockResolvedValue([]);
    vi.mocked(expensesApi.createSubcontractorExpense).mockRejectedValue(
      new expensesApi.ExpensesApiError('INVALID_STATE', 'Khong the ghi nhan chi phi cho du an da dong', 400)
    );

    render(<SubcontractorExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);
    await screen.findByTestId('subcontractor-expense-empty');

    fireEvent.click(screen.getByTestId('btn-add-subcontractor-expense'));
    fireEvent.change(screen.getByLabelText(/Nhà thầu/i), { target: { value: 'ABC' } });
    fireEvent.change(screen.getByLabelText(/Phạm vi công việc/i), { target: { value: 'Điện nước' } });
    fireEvent.change(screen.getByLabelText(/Số tiền/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByTestId('submit-subcontractor-expense-btn'));

    expect(await screen.findByTestId('subcontractor-expense-server-error')).toHaveTextContent(
      'Khong the ghi nhan chi phi cho du an da dong'
    );
  });

  it('hiển thị lỗi khi tải danh sách thất bại', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(RUNNING_PROJECT);
    vi.mocked(expensesApi.getProjectSubcontractorExpenses).mockRejectedValue(
      new expensesApi.ExpensesApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.', 403)
    );

    render(<SubcontractorExpenseListPage projectId={1} currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('subcontractor-expense-error')).toHaveTextContent(
      'Bạn không có quyền thực hiện thao tác này.'
    );
  });
});
