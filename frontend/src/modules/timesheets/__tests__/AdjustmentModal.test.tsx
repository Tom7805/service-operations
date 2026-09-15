import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdjustmentModal from '../components/AdjustmentModal';
import * as timesheetsApi from '../api/timesheetsApi';

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
    adjustTimeEntry: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

describe('AdjustmentModal (NCL-06-CN-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('báo lỗi khi thiếu Entry ID, số giờ đúng hoặc lý do — không gọi API', async () => {
    render(<AdjustmentModal projectId={1} taskId={20} onClose={vi.fn()} onAdjusted={vi.fn()} />);

    fireEvent.click(screen.getByText('Xác nhận điều chỉnh'));

    expect(await screen.findByText('Mã dòng giờ công phải là một số nguyên dương')).toBeInTheDocument();
    expect(screen.getByText('Số giờ đúng không được để trống')).toBeInTheDocument();
    expect(screen.getByText('Lý do điều chỉnh không được để trống')).toBeInTheDocument();
    expect(timesheetsApi.adjustTimeEntry).not.toHaveBeenCalled();
  });

  it('gọi adjustTimeEntry đúng projectId/taskId/entryId và payload khi dữ liệu hợp lệ', async () => {
    const onAdjusted = vi.fn();
    vi.mocked(timesheetsApi.adjustTimeEntry).mockResolvedValue({
      adjustmentId: 5,
      originalEntry: { id: 30, taskId: 20, userId: 7, workDate: '2026-09-09', hours: 8, status: 'APPROVED', note: null, billable: true, createdAt: '2026-09-09T00:00:00' },
      reversalEntry: { id: 31, taskId: 20, userId: 7, workDate: '2026-09-09', hours: -8, status: 'APPROVED', note: null, billable: true, createdAt: '2026-09-14T00:00:00' },
      correctedEntry: { id: 32, taskId: 20, userId: 7, workDate: '2026-09-09', hours: 6, status: 'APPROVED', note: null, billable: true, createdAt: '2026-09-14T00:00:00' },
      reason: 'Ghi nham 8 gio, thuc te lam 6 gio',
      adjustedBy: 'pm01',
      adjustedAt: '2026-09-14T10:00:00',
    });

    render(<AdjustmentModal projectId={1} taskId={20} onClose={vi.fn()} onAdjusted={onAdjusted} />);

    fireEvent.change(screen.getByLabelText(/Mã dòng giờ công/i), { target: { value: '30' } });
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
    expect(onAdjusted).toHaveBeenCalled();
  });

  it('hiển thị lỗi server khi backend từ chối (ví dụ dòng chưa duyệt)', async () => {
    vi.mocked(timesheetsApi.adjustTimeEntry).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('INVALID_STATE', 'Chi dieu chinh duoc dong gio cong da duyet')
    );

    render(<AdjustmentModal projectId={1} taskId={20} onClose={vi.fn()} onAdjusted={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Mã dòng giờ công/i), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText(/Số giờ đúng/i), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(/Lý do điều chỉnh/i), { target: { value: 'Sua lai gio' } });
    fireEvent.click(screen.getByText('Xác nhận điều chỉnh'));

    expect(await screen.findByText('Chi dieu chinh duoc dong gio cong da duyet')).toBeInTheDocument();
  });

  it('bấm "Hủy bỏ" thì gọi onClose, không gọi API', () => {
    const onClose = vi.fn();
    render(<AdjustmentModal projectId={1} taskId={20} onClose={onClose} onAdjusted={vi.fn()} />);

    fireEvent.click(screen.getByText('Hủy bỏ'));

    expect(onClose).toHaveBeenCalled();
    expect(timesheetsApi.adjustTimeEntry).not.toHaveBeenCalled();
  });
});
