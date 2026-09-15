import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UnsubmittedTimesheetsPage from '../pages/UnsubmittedTimesheetsPage';
import * as timesheetsApi from '../api/timesheetsApi';
import { addDays, getMondayOf } from '../utils/weekRange';

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
    getUnsubmittedTimesheets: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

const CURRENT_WEEK_FROM = getMondayOf();
const NEXT_WEEK_FROM = addDays(CURRENT_WEEK_FROM, 7);

describe('UnsubmittedTimesheetsPage (NCL-06-CN-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('từ chối truy cập cho vai trò không phải VT-02/VT-03', () => {
    render(<UnsubmittedTimesheetsPage currentUserRoles={['VT-05']} />);
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(timesheetsApi.getUnsubmittedTimesheets).not.toHaveBeenCalled();
  });

  it('cho phép VT-02 truy cập và tải đúng tuần hiện tại mặc định', async () => {
    vi.mocked(timesheetsApi.getUnsubmittedTimesheets).mockResolvedValue([]);

    render(<UnsubmittedTimesheetsPage currentUserRoles={['VT-02']} />);

    await waitFor(() =>
      expect(timesheetsApi.getUnsubmittedTimesheets).toHaveBeenCalledWith(CURRENT_WEEK_FROM)
    );
  });

  it('cho phép VT-03 truy cập', async () => {
    vi.mocked(timesheetsApi.getUnsubmittedTimesheets).mockResolvedValue([]);
    render(<UnsubmittedTimesheetsPage currentUserRoles={['VT-03']} />);
    await waitFor(() => expect(timesheetsApi.getUnsubmittedTimesheets).toHaveBeenCalled());
  });

  it('hiển thị danh sách nhân sự chưa nộp', async () => {
    vi.mocked(timesheetsApi.getUnsubmittedTimesheets).mockResolvedValue([
      { userId: 7, weekStartDate: CURRENT_WEEK_FROM, weekEndDate: addDays(CURRENT_WEEK_FROM, 6) },
      { userId: 8, weekStartDate: CURRENT_WEEK_FROM, weekEndDate: addDays(CURRENT_WEEK_FROM, 6) },
    ]);

    render(<UnsubmittedTimesheetsPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByTestId('unsubmitted-row-7')).toBeInTheDocument();
    expect(screen.getByTestId('unsubmitted-row-8')).toBeInTheDocument();
  });

  it('hiển thị trạng thái trống khi mọi người đã nộp đủ', async () => {
    vi.mocked(timesheetsApi.getUnsubmittedTimesheets).mockResolvedValue([]);

    render(<UnsubmittedTimesheetsPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByText(/Không còn ai chưa nộp bảng chấm công/i)).toBeInTheDocument();
  });

  it('chuyển sang tuần sau thì gọi lại API với weekStartDate mới', async () => {
    vi.mocked(timesheetsApi.getUnsubmittedTimesheets).mockResolvedValue([]);

    render(<UnsubmittedTimesheetsPage currentUserRoles={['VT-02']} />);
    await waitFor(() =>
      expect(timesheetsApi.getUnsubmittedTimesheets).toHaveBeenCalledWith(CURRENT_WEEK_FROM)
    );

    fireEvent.click(screen.getByLabelText('Xem tuần sau'));

    await waitFor(() =>
      expect(timesheetsApi.getUnsubmittedTimesheets).toHaveBeenLastCalledWith(NEXT_WEEK_FROM)
    );
  });

  it('hiển thị lỗi khi tra cứu thất bại', async () => {
    vi.mocked(timesheetsApi.getUnsubmittedTimesheets).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.', 401)
    );

    render(<UnsubmittedTimesheetsPage currentUserRoles={['VT-02']} />);

    expect(await screen.findByText('Phiên đăng nhập đã hết hạn.')).toBeInTheDocument();
  });
});
