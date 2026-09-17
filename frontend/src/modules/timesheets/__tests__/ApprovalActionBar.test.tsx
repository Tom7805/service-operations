import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApprovalActionBar from '../components/ApprovalActionBar';
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
    approveTimesheet: vi.fn(),
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

describe('ApprovalActionBar (NCL-06-CN-003/CN-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('duyệt nguyên bảng khi bấm "Xác nhận duyệt", gọi approveTimesheet không kèm entryIds', async () => {
    const onApproved = vi.fn();
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

    render(
      <ApprovalActionBar timesheet={TIMESHEET} onApproved={onApproved} onRejected={vi.fn()} onError={vi.fn()} />
    );

    fireEvent.click(screen.getByTestId('btn-approve-50'));
    fireEvent.click(screen.getByTestId('btn-confirm-approve'));

    await waitFor(() => expect(timesheetsApi.approveTimesheet).toHaveBeenCalledWith(50, {}));
    expect(onApproved).toHaveBeenCalled();
  });

  it('gửi kèm ghi chú khi PM có nhập ghi chú lúc duyệt', async () => {
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

    render(<ApprovalActionBar timesheet={TIMESHEET} onApproved={vi.fn()} onRejected={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByTestId('btn-approve-50'));
    fireEvent.change(screen.getByLabelText(/Ghi chú/i), { target: { value: 'Duyệt cho đợt này' } });
    fireEvent.click(screen.getByTestId('btn-confirm-approve'));

    await waitFor(() =>
      expect(timesheetsApi.approveTimesheet).toHaveBeenCalledWith(50, { note: 'Duyệt cho đợt này' })
    );
  });

  it('từ chối bắt buộc phải nhập lý do — không gọi API khi để trống', async () => {
    render(<ApprovalActionBar timesheet={TIMESHEET} onApproved={vi.fn()} onRejected={vi.fn()} onError={vi.fn()} />);

    fireEvent.click(screen.getByTestId('btn-reject-50'));
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));

    expect(await screen.findByText('Lý do từ chối không được để trống')).toBeInTheDocument();
    expect(timesheetsApi.rejectTimesheet).not.toHaveBeenCalled();
  });

  it('từ chối nguyên bảng với lý do hợp lệ thì gọi rejectTimesheet đúng payload', async () => {
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

    render(
      <ApprovalActionBar timesheet={TIMESHEET} onApproved={vi.fn()} onRejected={onRejected} onError={vi.fn()} />
    );

    fireEvent.click(screen.getByTestId('btn-reject-50'));
    fireEvent.change(screen.getByTestId('reject-reason-input'), { target: { value: 'Sai dự án' } });
    fireEvent.click(screen.getByTestId('btn-confirm-reject'));

    await waitFor(() => expect(timesheetsApi.rejectTimesheet).toHaveBeenCalledWith(50, { reason: 'Sai dự án' }));
    expect(onRejected).toHaveBeenCalled();
  });

  it('gọi onError khi duyệt thất bại (ví dụ bảng không còn PENDING_APPROVAL)', async () => {
    const onError = vi.fn();
    vi.mocked(timesheetsApi.approveTimesheet).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('INVALID_STATE', 'Bang cham cong khong o trang thai cho duyet')
    );

    render(<ApprovalActionBar timesheet={TIMESHEET} onApproved={vi.fn()} onRejected={vi.fn()} onError={onError} />);

    fireEvent.click(screen.getByTestId('btn-approve-50'));
    fireEvent.click(screen.getByTestId('btn-confirm-approve'));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Bang cham cong khong o trang thai cho duyet'));
  });
});
