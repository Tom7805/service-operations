import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimesheetApprovalPage from '../pages/TimesheetApprovalPage';
import * as timesheetsApi from '../api/timesheetsApi';
import type { PendingTimesheetRes, TimesheetApprovalHistoryRes } from '../types/timesheetTypes';

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
    getMyApprovalHistory: vi.fn(),
    approveTimesheet: vi.fn(),
    rejectTimesheet: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

const PENDING_1: PendingTimesheetRes = {
  timesheetId: 50,
  userId: 7,
  userName: 'Nguyen Van A',
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
  userName: 'Tran Thi B',
  weekStartDate: '2026-09-07',
  weekEndDate: '2026-09-13',
  totalHours: 8,
  pendingEntries: 2,
  pendingHours: 8,
  submittedAt: '2026-09-13T11:00:00',
};

describe('TimesheetApprovalPage (NCL-06-CN-003 — Duyệt bảng chấm công)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    // Mặc định không có lịch sử — từng test chỉ override khi cần kiểm tra nội dung lịch sử.
    vi.mocked(timesheetsApi.getMyApprovalHistory).mockResolvedValue([]);
  });

  it('từ chối truy cập cho vai trò khác VT-02', () => {
    render(<TimesheetApprovalPage currentUserRoles={['VT-03']} />);
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(timesheetsApi.getPendingTimesheets).not.toHaveBeenCalled();
  });

  it('tải và hiển thị danh sách bảng chấm công đang chờ duyệt', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([PENDING_1, PENDING_2]);

    render(<TimesheetApprovalPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('pending-row-50')).toHaveTextContent('Nguyen Van A');
    expect(screen.getByTestId('pending-row-51')).toHaveTextContent('Tran Thi B');
  });

  it('hiển thị trạng thái trống khi không có bảng nào chờ duyệt', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([]);

    render(<TimesheetApprovalPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByText(/Không có bảng chấm công nào đang chờ duyệt/i)).toBeInTheDocument();
  });

  it('hiển thị lỗi khi tải hàng chờ duyệt thất bại', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.', 401)
    );

    render(<TimesheetApprovalPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByText('Phiên đăng nhập đã hết hạn.')).toBeInTheDocument();
  });

  it('duyệt một bảng thành công thì gỡ khỏi danh sách và hiện toast', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([PENDING_1, PENDING_2]);
    vi.mocked(timesheetsApi.approveTimesheet).mockResolvedValue({
      timesheet: {
        id: 50,
        userId: 7,
        weekStartDate: '2026-09-07',
        weekEndDate: '2026-09-13',
        status: 'APPROVED',
        totalHours: 10,
        submittedBy: 'nv01',
        submittedAt: '2026-09-13T10:00:00',
      },
      overBudgetWarnings: [],
    });

    render(<TimesheetApprovalPage currentUserRoles={['VT-02']} />);
    await screen.findByTestId('pending-row-50');

    fireEvent.click(screen.getByTestId('btn-approve-50'));
    fireEvent.click(screen.getByTestId('btn-confirm-approve'));

    await waitFor(() => expect(screen.queryByTestId('pending-row-50')).not.toBeInTheDocument());
    expect(screen.getByTestId('pending-row-51')).toBeInTheDocument();
    expect(screen.getByText(/Đã duyệt bảng chấm công của Nguyen Van A thành công/i)).toBeInTheDocument();
    // Sau khi duyệt xong phải tải lại lịch sử từ máy chủ (không tự dựng dữ liệu ở client).
    await waitFor(() => expect(timesheetsApi.getMyApprovalHistory).toHaveBeenCalledTimes(2));
  });

  it('hiển thị lịch sử duyệt/từ chối lấy từ máy chủ để tra lại sau khi bảng đã rời hàng chờ', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([]);
    const historyRow: TimesheetApprovalHistoryRes = {
      auditLogId: 1,
      timesheetId: 50,
      userId: 7,
      userName: 'Nguyen Van A',
      weekStartDate: '2026-09-07',
      weekEndDate: '2026-09-13',
      action: 'APPROVED',
      detail: 'Khong co canh bao vuot ngan sach.',
      performedAt: '2026-09-14T09:00:00',
    };
    vi.mocked(timesheetsApi.getMyApprovalHistory).mockResolvedValue([historyRow]);

    render(<TimesheetApprovalPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('history-row-1')).toHaveTextContent('Nguyen Van A');
    expect(screen.getByTestId('history-row-1')).toHaveTextContent('Đã duyệt');
  });

  it('duyệt thành công kèm cảnh báo vượt ngân sách vẫn hiện toast với nội dung cảnh báo', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([PENDING_1]);
    vi.mocked(timesheetsApi.approveTimesheet).mockResolvedValue({
      timesheet: {
        id: 50,
        userId: 7,
        weekStartDate: '2026-09-07',
        weekEndDate: '2026-09-13',
        status: 'APPROVED',
        totalHours: 10,
        submittedBy: 'nv01',
        submittedAt: '2026-09-13T10:00:00',
      },
      overBudgetWarnings: ['Cong viec #20 Phan tich: 8/8 gio — da vuot nguong 80% ngan sach (QTN-20)'],
    });

    render(<TimesheetApprovalPage currentUserRoles={['VT-02']} />);
    await screen.findByTestId('pending-row-50');

    fireEvent.click(screen.getByTestId('btn-approve-50'));
    fireEvent.click(screen.getByTestId('btn-confirm-approve'));

    expect(await screen.findAllByText(/da vuot nguong 80% ngan sach/i)).not.toHaveLength(0);
  });

  it('từ chối một bảng thành công thì gỡ khỏi danh sách và hiện toast', async () => {
    vi.mocked(timesheetsApi.getPendingTimesheets).mockResolvedValue([PENDING_1]);
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

    render(<TimesheetApprovalPage currentUserRoles={['VT-02']} />);
    await screen.findByTestId('pending-row-50');

    fireEvent.click(screen.getByTestId('btn-reject-50'));
    fireEvent.change(screen.getByTestId('reject-reason-input'), { target: { value: 'Sai du an' } });
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));

    await waitFor(() => expect(screen.queryByTestId('pending-row-50')).not.toBeInTheDocument());
    expect(screen.getByText(/Đã từ chối 1 dòng giờ công của Nguyen Van A/i)).toBeInTheDocument();
  });
});
