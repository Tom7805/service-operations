import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OverheadAllocationPage from '../pages/OverheadAllocationPage';
import * as expensesApi from '../api/expensesApi';
import type { OverheadAllocationRes } from '../types/expenseTypes';

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
    runOverheadAllocation: vi.fn(),
    ExpensesApiError: MockExpensesApiError,
  };
});

const RESULT: OverheadAllocationRes = {
  id: 1,
  periodStart: '2026-06-01',
  periodEnd: '2026-06-30',
  totalAmount: 50000000,
  allocations: [
    { projectId: 10, approvedHours: 300, allocatedAmount: 30000000 },
    { projectId: 11, approvedHours: 200, allocatedAmount: 20000000 },
  ],
  createdAt: '2026-07-01T08:00:00',
};

describe('OverheadAllocationPage (NCL-08-CN-005 — Phân bổ chi phí chung cho dự án)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<OverheadAllocationPage currentUserRoles={['VT-02']} />);
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(expensesApi.runOverheadAllocation).not.toHaveBeenCalled();
  });

  it('hiển thị trạng thái trống khi chưa chạy lần nào trong phiên', () => {
    render(<OverheadAllocationPage currentUserRoles={['VT-05']} />);
    expect(screen.getByTestId('overhead-allocation-empty')).toBeInTheDocument();
  });

  it('không cho chạy khi bỏ trống tổng chi phí chung', async () => {
    render(<OverheadAllocationPage currentUserRoles={['VT-05']} />);

    fireEvent.click(screen.getByTestId('btn-run-overhead-allocation'));

    expect(await screen.findByTestId('error-overhead-amount')).toHaveTextContent(
      'Tổng chi phí chung không được để trống'
    );
    expect(expensesApi.runOverheadAllocation).not.toHaveBeenCalled();
  });

  it('chạy phân bổ thành công thì hiện kết quả và toast, có xác nhận trước khi chạy', async () => {
    vi.mocked(expensesApi.runOverheadAllocation).mockResolvedValue(RESULT);

    render(<OverheadAllocationPage currentUserRoles={['VT-05']} />);

    fireEvent.change(screen.getByTestId('overhead-year-input'), { target: { value: '2026' } });
    fireEvent.change(screen.getByTestId('overhead-month-select'), { target: { value: '6' } });
    fireEvent.change(screen.getByTestId('overhead-amount-input'), { target: { value: '50000000' } });
    fireEvent.click(screen.getByTestId('btn-run-overhead-allocation'));

    await waitFor(() =>
      expect(expensesApi.runOverheadAllocation).toHaveBeenCalledWith({ year: 2026, month: 6, totalAmount: 50000000 })
    );
    expect(window.confirm).toHaveBeenCalled();
    expect(await screen.findByTestId('overhead-allocation-result-1')).toBeInTheDocument();
    expect(screen.getByTestId('overhead-allocation-line-1-10')).toHaveTextContent('Dự án #10');
    expect(screen.getByTestId('overhead-allocation-line-1-11')).toHaveTextContent('Dự án #11');
    expect(screen.getByText(/Đã phân bổ/i)).toBeInTheDocument();
  });

  it('không gọi API khi người dùng hủy xác nhận', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<OverheadAllocationPage currentUserRoles={['VT-05']} />);
    fireEvent.change(screen.getByTestId('overhead-amount-input'), { target: { value: '1000000' } });
    fireEvent.click(screen.getByTestId('btn-run-overhead-allocation'));

    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(expensesApi.runOverheadAllocation).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi khi kỳ đã được phân bổ trước đó (DUPLICATE_DATA)', async () => {
    vi.mocked(expensesApi.runOverheadAllocation).mockRejectedValue(
      new expensesApi.ExpensesApiError('DUPLICATE_DATA', 'Ky 2026-06 da duoc phan bo chi phi chung tu truoc', 400)
    );

    render(<OverheadAllocationPage currentUserRoles={['VT-05']} />);
    fireEvent.change(screen.getByTestId('overhead-amount-input'), { target: { value: '1000000' } });
    fireEvent.click(screen.getByTestId('btn-run-overhead-allocation'));

    expect(await screen.findByText('Ky 2026-06 da duoc phan bo chi phi chung tu truoc')).toBeInTheDocument();
    expect(screen.getByTestId('overhead-allocation-empty')).toBeInTheDocument();
  });

  it('hiển thị lỗi khi kỳ chưa có giờ công được duyệt (INVALID_STATE)', async () => {
    vi.mocked(expensesApi.runOverheadAllocation).mockRejectedValue(
      new expensesApi.ExpensesApiError(
        'INVALID_STATE',
        'Ky 2026-06 chua co gio cong duoc duyet cho du an nao, khong the phan bo chi phi chung',
        400
      )
    );

    render(<OverheadAllocationPage currentUserRoles={['VT-05']} />);
    fireEvent.change(screen.getByTestId('overhead-amount-input'), { target: { value: '1000000' } });
    fireEvent.click(screen.getByTestId('btn-run-overhead-allocation'));

    expect(
      await screen.findByText('Ky 2026-06 chua co gio cong duoc duyet cho du an nao, khong the phan bo chi phi chung')
    ).toBeInTheDocument();
  });
});
