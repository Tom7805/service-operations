import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimesheetPeriodPage from '../pages/TimesheetPeriodPage';
import * as timesheetsApi from '../api/timesheetsApi';
import type { TimesheetPeriodRes } from '../types/timesheetTypes';

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
    getTimesheetPeriods: vi.fn(),
    lockTimesheetPeriod: vi.fn(),
    unlockTimesheetPeriod: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

const OPEN_PERIOD: TimesheetPeriodRes = {
  id: 3,
  periodStart: '2026-09-01',
  periodEnd: '2026-09-30',
  status: 'OPEN',
  lockedBy: null,
  lockedAt: null,
};

const LOCKED_PERIOD: TimesheetPeriodRes = {
  id: 2,
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  status: 'LOCKED',
  lockedBy: 'ketoan01',
  lockedAt: '2026-09-01T08:00:00',
};

describe('TimesheetPeriodPage (NCL-06-CN-006 — Khóa kỳ chấm công)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('từ chối truy cập cho vai trò khác VT-05', () => {
    render(<TimesheetPeriodPage currentUserRoles={['VT-02']} />);
    expect(screen.getByText(/Bạn không có thẩm quyền truy cập màn hình này/i)).toBeInTheDocument();
    expect(timesheetsApi.getTimesheetPeriods).not.toHaveBeenCalled();
  });

  it('tải và hiển thị danh sách kỳ chấm công với đúng trạng thái', async () => {
    vi.mocked(timesheetsApi.getTimesheetPeriods).mockResolvedValue([OPEN_PERIOD, LOCKED_PERIOD]);

    render(<TimesheetPeriodPage currentUserRoles={['VT-05']} />);

    expect(await screen.findByTestId('period-row-3')).toHaveTextContent('Tháng 9/2026');
    expect(screen.getByTestId('period-row-3')).toHaveTextContent('Đang mở');
    expect(screen.getByTestId('period-row-2')).toHaveTextContent('Tháng 8/2026');
    expect(screen.getByTestId('period-row-2')).toHaveTextContent('Đã khóa');
    expect(screen.getByTestId('period-row-2')).toHaveTextContent('ketoan01');
  });

  it('hiển thị trạng thái trống khi chưa có kỳ nào', async () => {
    vi.mocked(timesheetsApi.getTimesheetPeriods).mockResolvedValue([]);

    render(<TimesheetPeriodPage currentUserRoles={['VT-05']} />);

    expect(await screen.findByText(/Chưa có kỳ chấm công nào được khóa/i)).toBeInTheDocument();
  });

  it('khóa kỳ mới theo tháng/năm nhập vào', async () => {
    vi.mocked(timesheetsApi.getTimesheetPeriods).mockResolvedValue([]);
    vi.mocked(timesheetsApi.lockTimesheetPeriod).mockResolvedValue(OPEN_PERIOD.status === 'OPEN'
      ? { ...OPEN_PERIOD, status: 'LOCKED', lockedBy: 'ketoan01', lockedAt: '2026-09-15T00:00:00' }
      : OPEN_PERIOD);

    render(<TimesheetPeriodPage currentUserRoles={['VT-05']} />);
    await waitFor(() => expect(timesheetsApi.getTimesheetPeriods).toHaveBeenCalled());

    fireEvent.change(screen.getByTestId('lock-year-input'), { target: { value: '2026' } });
    fireEvent.change(screen.getByTestId('lock-month-select'), { target: { value: '9' } });
    fireEvent.click(screen.getByTestId('btn-lock-new-period'));

    await waitFor(() => expect(timesheetsApi.lockTimesheetPeriod).toHaveBeenCalledWith({ year: 2026, month: 9 }));
    expect(await screen.findByTestId('period-row-3')).toHaveTextContent('Đã khóa');
  });

  it('khóa một kỳ OPEN có sẵn trong danh sách qua nút "Khóa"', async () => {
    vi.mocked(timesheetsApi.getTimesheetPeriods).mockResolvedValue([OPEN_PERIOD]);
    vi.mocked(timesheetsApi.lockTimesheetPeriod).mockResolvedValue({
      ...OPEN_PERIOD,
      status: 'LOCKED',
      lockedBy: 'ketoan01',
      lockedAt: '2026-09-15T00:00:00',
    });

    render(<TimesheetPeriodPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('period-row-3');

    fireEvent.click(screen.getByTestId('btn-lock-3'));

    await waitFor(() => expect(timesheetsApi.lockTimesheetPeriod).toHaveBeenCalledWith({ year: 2026, month: 9 }));
    expect(await screen.findByTestId('btn-unlock-3')).toBeInTheDocument();
  });

  it('mở lại một kỳ đã khóa qua nút "Mở khóa"', async () => {
    vi.mocked(timesheetsApi.getTimesheetPeriods).mockResolvedValue([LOCKED_PERIOD]);
    vi.mocked(timesheetsApi.unlockTimesheetPeriod).mockResolvedValue({
      ...LOCKED_PERIOD,
      status: 'OPEN',
      lockedBy: null,
      lockedAt: null,
    });

    render(<TimesheetPeriodPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('period-row-2');

    fireEvent.click(screen.getByTestId('btn-unlock-2'));

    await waitFor(() => expect(timesheetsApi.unlockTimesheetPeriod).toHaveBeenCalledWith(2));
    expect(await screen.findByTestId('btn-lock-2')).toBeInTheDocument();
  });

  it('không gọi API khi người dùng huỷ hộp thoại xác nhận khóa', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.mocked(timesheetsApi.getTimesheetPeriods).mockResolvedValue([OPEN_PERIOD]);

    render(<TimesheetPeriodPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('period-row-3');

    fireEvent.click(screen.getByTestId('btn-lock-3'));

    expect(timesheetsApi.lockTimesheetPeriod).not.toHaveBeenCalled();
  });

  it('hiển thị lỗi khi khóa thất bại (ví dụ còn bảng chấm công đang chờ duyệt)', async () => {
    vi.mocked(timesheetsApi.getTimesheetPeriods).mockResolvedValue([OPEN_PERIOD]);
    vi.mocked(timesheetsApi.lockTimesheetPeriod).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('INVALID_STATE', 'Con bang cham cong dang cho duyet trong ky nay')
    );

    render(<TimesheetPeriodPage currentUserRoles={['VT-05']} />);
    await screen.findByTestId('period-row-3');

    fireEvent.click(screen.getByTestId('btn-lock-3'));

    expect(await screen.findByText('Con bang cham cong dang cho duyet trong ky nay')).toBeInTheDocument();
  });
});
