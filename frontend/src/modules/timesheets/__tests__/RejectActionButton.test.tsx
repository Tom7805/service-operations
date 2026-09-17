import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RejectActionButton from '../components/RejectActionButton';
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
    rejectTimesheet: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

const TIMESHEET: PendingTimesheetRes = {
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

describe('RejectActionButton (NCL-06-CN-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chỉ hiện đúng một nút "Từ chối", không có nút duyệt', () => {
    render(<RejectActionButton timesheet={TIMESHEET} onRejected={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByTestId('btn-reject-50')).toBeInTheDocument();
    expect(screen.queryByText(/Duyệt/i)).not.toBeInTheDocument();
  });

  it('chặn xác nhận khi để trống lý do, không gọi API', async () => {
    render(<RejectActionButton timesheet={TIMESHEET} onRejected={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByTestId('btn-reject-50'));
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));

    expect(await screen.findByText('Lý do từ chối không được để trống')).toBeInTheDocument();
    expect(timesheetsApi.rejectTimesheet).not.toHaveBeenCalled();
  });

  it('xoá lỗi ngay khi người dùng gõ lại lý do', async () => {
    render(<RejectActionButton timesheet={TIMESHEET} onRejected={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByTestId('btn-reject-50'));
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));
    expect(await screen.findByText('Lý do từ chối không được để trống')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('reject-reason-input'), { target: { value: 'S' } });
    expect(screen.queryByText('Lý do từ chối không được để trống')).not.toBeInTheDocument();
  });

  it('gọi rejectTimesheet nguyên bảng (không kèm entryIds) với lý do hợp lệ', async () => {
    const onRejected = vi.fn();
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

    render(<RejectActionButton timesheet={TIMESHEET} onRejected={onRejected} onError={vi.fn()} />);

    fireEvent.click(screen.getByTestId('btn-reject-50'));
    fireEvent.change(screen.getByTestId('reject-reason-input'), { target: { value: 'Sai dự án' } });
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));

    await waitFor(() => expect(timesheetsApi.rejectTimesheet).toHaveBeenCalledWith(50, { reason: 'Sai dự án' }));
    expect(onRejected).toHaveBeenCalled();
  });

  it('gọi onError khi từ chối thất bại (ví dụ bảng không còn PENDING_APPROVAL)', async () => {
    const onError = vi.fn();
    vi.mocked(timesheetsApi.rejectTimesheet).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('INVALID_STATE', 'Bang cham cong khong con dong SUBMITTED nao')
    );

    render(<RejectActionButton timesheet={TIMESHEET} onRejected={vi.fn()} onError={onError} />);

    fireEvent.click(screen.getByTestId('btn-reject-50'));
    fireEvent.change(screen.getByTestId('reject-reason-input'), { target: { value: 'Sai dự án' } });
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Bang cham cong khong con dong SUBMITTED nao'));
  });

  it('bấm "Hủy bỏ" thì đóng modal và không gọi API', () => {
    render(<RejectActionButton timesheet={TIMESHEET} onRejected={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByTestId('btn-reject-50'));
    fireEvent.change(screen.getByTestId('reject-reason-input'), { target: { value: 'Nhap do roi huy' } });
    fireEvent.click(screen.getByText('Hủy bỏ'));

    expect(screen.queryByTestId('reject-reason-input')).not.toBeInTheDocument();
    expect(timesheetsApi.rejectTimesheet).not.toHaveBeenCalled();
  });
});
