import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimesheetAdjustmentPage from '../pages/TimesheetAdjustmentPage';
import * as timesheetsApi from '../api/timesheetsApi';
import type { AdjustmentTraceRes } from '../types/timesheetTypes';

vi.mock('../api/timesheetsApi', () => {
  class MockTimesheetsApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'TimesheetsApiError';
    }
  }

  return {
    getAdjustmentHistory: vi.fn(),
    adjustTimeEntry: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

const HISTORY_ITEM: AdjustmentTraceRes = {
  adjustmentId: 5,
  originalEntry: {
    id: 30,
    taskId: 20,
    userId: 7,
    workDate: '2026-09-09',
    hours: 8,
    status: 'APPROVED',
    note: null,
    billable: true,
    createdAt: '2026-09-09T00:00:00',
  },
  reversalEntry: {
    id: 31,
    taskId: 20,
    userId: 7,
    workDate: '2026-09-09',
    hours: -8,
    status: 'APPROVED',
    note: null,
    billable: true,
    createdAt: '2026-09-14T00:00:00',
  },
  correctedEntry: {
    id: 32,
    taskId: 20,
    userId: 7,
    workDate: '2026-09-09',
    hours: 6,
    status: 'APPROVED',
    note: null,
    billable: true,
    createdAt: '2026-09-14T00:00:00',
  },
  reason: 'Ghi nham 8 gio, thuc te lam 6 gio',
  adjustedBy: 'pm01',
  adjustedAt: '2026-09-14T10:00:00',
};

describe('TimesheetAdjustmentPage (NCL-06-CN-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò khác VT-02', () => {
    render(<TimesheetAdjustmentPage currentUserRoles={['VT-03']} />);
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(timesheetsApi.getAdjustmentHistory).not.toHaveBeenCalled();
  });

  it('báo lỗi khi tra cứu với mã dự án/công việc không hợp lệ, không gọi API', () => {
    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);

    fireEvent.click(screen.getByTestId('btn-lookup'));

    expect(
      screen.getByText('Vui lòng nhập mã dự án và mã công việc hợp lệ (số nguyên dương).')
    ).toBeInTheDocument();
    expect(timesheetsApi.getAdjustmentHistory).not.toHaveBeenCalled();
  });

  it('tra cứu thành công thì hiển thị lịch sử điều chỉnh và nút tạo điều chỉnh mới', async () => {
    vi.mocked(timesheetsApi.getAdjustmentHistory).mockResolvedValue([HISTORY_ITEM]);

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);

    fireEvent.change(screen.getByTestId('lookup-project-id'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('lookup-task-id'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('btn-lookup'));

    await waitFor(() => expect(timesheetsApi.getAdjustmentHistory).toHaveBeenCalledWith(1, 20));
    expect(await screen.findByTestId('adjustment-row-5')).toHaveTextContent('Ghi nham 8 gio, thuc te lam 6 gio');
    expect(screen.getByTestId('btn-open-adjustment-modal')).toBeInTheDocument();
  });

  it('tra cứu công việc chưa từng điều chỉnh thì hiện trạng thái trống', async () => {
    vi.mocked(timesheetsApi.getAdjustmentHistory).mockResolvedValue([]);

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);
    fireEvent.change(screen.getByTestId('lookup-project-id'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('lookup-task-id'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('btn-lookup'));

    expect(await screen.findByText(/Chưa có điều chỉnh nào cho công việc này/i)).toBeInTheDocument();
  });

  it('hiển thị lỗi khi tra cứu công việc không thuộc dự án mình quản lý', async () => {
    vi.mocked(timesheetsApi.getAdjustmentHistory).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('FORBIDDEN', 'Ban khong phai quan ly cua du an nay', 403)
    );

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);
    fireEvent.change(screen.getByTestId('lookup-project-id'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('lookup-task-id'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('btn-lookup'));

    expect(await screen.findByText('Ban khong phai quan ly cua du an nay')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-open-adjustment-modal')).not.toBeInTheDocument();
  });

  it('tạo điều chỉnh mới thành công thì thêm vào đầu lịch sử và hiện toast', async () => {
    vi.mocked(timesheetsApi.getAdjustmentHistory).mockResolvedValue([]);
    vi.mocked(timesheetsApi.adjustTimeEntry).mockResolvedValue(HISTORY_ITEM);

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);
    fireEvent.change(screen.getByTestId('lookup-project-id'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('lookup-task-id'), { target: { value: '20' } });
    fireEvent.click(screen.getByTestId('btn-lookup'));
    await screen.findByText(/Chưa có điều chỉnh nào/i);

    fireEvent.click(screen.getByTestId('btn-open-adjustment-modal'));
    fireEvent.change(screen.getByLabelText(/Mã dòng giờ công/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Số giờ đúng/i), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(/Lý do điều chỉnh/i), {
      target: { value: 'Ghi nham 8 gio, thuc te lam 6 gio' },
    });
    fireEvent.click(screen.getByText('Xác nhận điều chỉnh'));

    await waitFor(() => expect(screen.getByTestId('adjustment-row-5')).toBeInTheDocument());
    expect(screen.getByText(/Đã điều chỉnh dòng #30 thành công/i)).toBeInTheDocument();
  });
});
