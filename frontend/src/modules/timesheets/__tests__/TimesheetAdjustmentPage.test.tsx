import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimesheetAdjustmentPage from '../pages/TimesheetAdjustmentPage';
import * as timesheetsApi from '../api/timesheetsApi';
import * as usersApi from '../../users/api/usersApi';
import type { AdjustableEntryRes, AdjustmentTraceRes } from '../types/timesheetTypes';

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
    getAdjustableEntries: vi.fn(),
    getAdjustmentHistory: vi.fn(),
    adjustTimeEntry: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

vi.mock('../../users/api/usersApi', () => ({
  getActiveUsersLookup: vi.fn(),
}));

const ADJUSTABLE_ENTRY: AdjustableEntryRes = {
  entryId: 30,
  projectId: 1,
  projectName: 'Website bán hàng',
  taskId: 20,
  taskName: 'Thiết kế màn hình đăng nhập',
  userId: 7,
  workDate: '2026-09-09',
  hours: 8,
  note: 'Ghi nhầm giờ',
};

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
    vi.mocked(usersApi.getActiveUsersLookup).mockResolvedValue([{ id: 7, fullName: 'Trịnh Thị Thu' }]);
  });

  it('từ chối truy cập cho vai trò khác VT-02', () => {
    render(<TimesheetAdjustmentPage currentUserRoles={['VT-03']} />);
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(timesheetsApi.getAdjustableEntries).not.toHaveBeenCalled();
  });

  it('tải sẵn danh sách dòng giờ công có thể điều chỉnh khi vào màn hình', async () => {
    vi.mocked(timesheetsApi.getAdjustableEntries).mockResolvedValue([ADJUSTABLE_ENTRY]);

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);

    await waitFor(() => expect(timesheetsApi.getAdjustableEntries).toHaveBeenCalled());
    expect(await screen.findByTestId('adjustable-entry-row-30')).toHaveTextContent('Website bán hàng');
    expect(screen.getByTestId('adjustable-entry-row-30')).toHaveTextContent('Thiết kế màn hình đăng nhập');
    // Tra được tên thật của nhân sự qua GET /users/lookup — không còn hiện "Nhân sự #7" trơ trọi.
    expect(await screen.findByTestId('adjustable-entry-row-30')).toHaveTextContent('Trịnh Thị Thu');
  });

  it('không tra được tên nhân sự (lỗi mạng) thì vẫn hiện được bảng, chỉ rớt về hiện mã', async () => {
    vi.mocked(timesheetsApi.getAdjustableEntries).mockResolvedValue([ADJUSTABLE_ENTRY]);
    vi.mocked(usersApi.getActiveUsersLookup).mockRejectedValue(new Error('network down'));

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('adjustable-entry-row-30')).toHaveTextContent('Nhân sự #7');
  });

  it('không có dòng nào cần điều chỉnh thì hiện trạng thái trống', async () => {
    vi.mocked(timesheetsApi.getAdjustableEntries).mockResolvedValue([]);

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByText(/Không có dòng giờ công nào cần điều chỉnh/i)).toBeInTheDocument();
  });

  it('lỗi khi tải danh sách thì hiện thông báo lỗi', async () => {
    vi.mocked(timesheetsApi.getAdjustableEntries).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('SERVER_ERROR', 'Không thể tải danh sách.', 500)
    );

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByText('Không thể tải danh sách.')).toBeInTheDocument();
  });

  it('bấm "Lịch sử" trên một dòng thì tải và hiện lịch sử điều chỉnh của đúng công việc', async () => {
    vi.mocked(timesheetsApi.getAdjustableEntries).mockResolvedValue([ADJUSTABLE_ENTRY]);
    vi.mocked(timesheetsApi.getAdjustmentHistory).mockResolvedValue([HISTORY_ITEM]);

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);
    await screen.findByTestId('adjustable-entry-row-30');

    fireEvent.click(screen.getByTestId('btn-view-history-30'));

    await waitFor(() => expect(timesheetsApi.getAdjustmentHistory).toHaveBeenCalledWith(1, 20));
    expect(await screen.findByTestId('adjustment-row-5')).toHaveTextContent('Ghi nham 8 gio, thuc te lam 6 gio');
  });

  it('bấm "Điều chỉnh" mở modal với dòng đã chọn sẵn (không hỏi lại Entry ID), tạo thành công thì bỏ dòng khỏi danh sách và hiện toast', async () => {
    vi.mocked(timesheetsApi.getAdjustableEntries).mockResolvedValue([ADJUSTABLE_ENTRY]);
    vi.mocked(timesheetsApi.getAdjustmentHistory).mockResolvedValue([HISTORY_ITEM]);
    vi.mocked(timesheetsApi.adjustTimeEntry).mockResolvedValue(HISTORY_ITEM);

    render(<TimesheetAdjustmentPage currentUserRoles={['VT-02']} />);
    await screen.findByTestId('adjustable-entry-row-30');

    fireEvent.click(screen.getByTestId('btn-adjust-30'));

    // Đã chọn sẵn dòng #30 từ bảng — không hỏi lại Entry ID, chỉ hiện banner tóm tắt (mã dòng
    // chuyển sang tooltip cho gọn, không còn in "#30" ra text).
    expect(screen.getByTitle('Mã dòng #30')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mã dòng giờ công/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Số giờ đúng/i), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(/Lý do điều chỉnh/i), {
      target: { value: 'Ghi nham 8 gio, thuc te lam 6 gio' },
    });
    fireEvent.click(screen.getByText('Xác nhận điều chỉnh'));

    await waitFor(() =>
      expect(timesheetsApi.adjustTimeEntry).toHaveBeenCalledWith(1, 20, 30, {
        correctedHours: 6,
        reason: 'Ghi nham 8 gio, thuc te lam 6 gio',
      })
    );
    expect(await screen.findByText(/Đã điều chỉnh dòng #30 thành công/i)).toBeInTheDocument();
    expect(screen.queryByTestId('adjustable-entry-row-30')).not.toBeInTheDocument();
  });
});
