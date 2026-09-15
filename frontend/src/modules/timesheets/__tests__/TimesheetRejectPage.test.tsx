import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimesheetRejectPage from '../pages/TimesheetRejectPage';
import * as timesheetsApi from '../api/timesheetsApi';
import type { PendingTimesheetRes } from '../types/timesheetTypes';

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
    getPendingTimesheets: vi.fn(),
    rejectTimesheet: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

const PENDING_1: PendingTimesheetRes = {
  timesheetId: 50,
  userId: 7,
  weekStartDate: '2026-09-07',
  weekEndDate: '2026-09-13',
  totalHours: 10,
  pendingEntries: 1,
  pendingHours: 5,
  submittedAt: '2026-09-13T10:00:00',
};

const PENDING_2: PendingTimesheetRes = {
  timesheetId: 51,
  userId: 8,
  weekStartDate: '2026-09-07',
  weekEndDate: '2026-09-13',
  totalHours: 8,
  pendingEntries: 2,
  pendingHours: 8,
  submittedAt: '2026-09-13T11:00:00',
};

describe('TimesheetRejectPage (NCL-06-CN-004 — Từ chối bảng chấm công)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò khác VT-02', () => {
    render(<TimesheetRejectPage currentUserRoles={['VT-03']} />);
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(timesheetsApi.getPendingTimesheets).not.toHaveBeenCalled();
  });

  it('tải và hiển thị danh sách bảng chấm công đang chờ duyệt, chỉ có nút Từ chối', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([PENDING_1, PENDING_2]);

    render(<TimesheetRejectPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('pending-row-50')).toHaveTextContent('Nhân sự #7');
    expect(screen.getByTestId('pending-row-51')).toHaveTextContent('Nhân sự #8');
    expect(screen.getByTestId('btn-reject-50')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-approve-50')).not.toBeInTheDocument();
  });

  it('hiển thị trạng thái trống khi không có bảng nào chờ duyệt', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([]);

    render(<TimesheetRejectPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByText(/Không có bảng chấm công nào đang chờ duyệt/i)).toBeInTheDocument();
  });

  it('hiển thị lỗi khi tải hàng chờ duyệt thất bại', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.', 401)
    );

    render(<TimesheetRejectPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByText('Phiên đăng nhập đã hết hạn.')).toBeInTheDocument();
  });

  it('từ chối một bảng thành công thì gỡ khỏi danh sách và hiện toast', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([PENDING_1, PENDING_2]);
    vi.mocked(timesheetsApi.rejectTimesheet).mockResolvedValue({
      timesheet: {
        id: 50,
        userId: 7,
        weekStartDate: '2026-09-07',
        weekEndDate: '2026-09-13',
        status: 'REJECTED',
        totalHours: 10,
        submittedBy: 'nv01',
        submittedAt: '2026-09-13T10:00:00',
      },
      rejectedEntries: 1,
    });

    render(<TimesheetRejectPage currentUserRoles={['VT-02']} />);
    await screen.findByTestId('pending-row-50');

    fireEvent.click(screen.getByTestId('btn-reject-50'));
    fireEvent.change(screen.getByTestId('reject-reason-input'), { target: { value: 'Sai du an' } });
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));

    await waitFor(() => expect(screen.queryByTestId('pending-row-50')).not.toBeInTheDocument());
    expect(screen.getByTestId('pending-row-51')).toBeInTheDocument();
    expect(screen.getByText(/Đã từ chối 1 dòng giờ công của Nhân sự #7/i)).toBeInTheDocument();
  });

  it('cho phép tải lại danh sách qua nút Tải lại', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([PENDING_1]);

    render(<TimesheetRejectPage currentUserRoles={['VT-02']} />);
    await screen.findByTestId('pending-row-50');

    fireEvent.click(screen.getByTitle('Tải lại'));

    await waitFor(() => expect(timesheetsApi.getPendingTimesheets).toHaveBeenCalledTimes(2));
  });
});
