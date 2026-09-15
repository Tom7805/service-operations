import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimerWidget from '../components/TimerWidget';
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
    getMyTimer: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

describe('TimerWidget (NCL-06-CN-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiện nút "Bắt đầu bấm giờ" khi chưa có phiên nào đang chạy', async () => {
    vi.mocked(timesheetsApi.getMyTimer).mockResolvedValue(null);

    render(<TimerWidget projectId={1} taskId={20} canStart onStopped={vi.fn()} onError={vi.fn()} />);

    expect(await screen.findByTestId('btn-open-start-timer')).toBeInTheDocument();
  });

  it('vô hiệu hoá nút bắt đầu khi canStart=false (ví dụ dự án đã đóng)', async () => {
    vi.mocked(timesheetsApi.getMyTimer).mockResolvedValue(null);

    render(<TimerWidget projectId={1} taskId={20} canStart={false} onStopped={vi.fn()} onError={vi.fn()} />);

    expect(await screen.findByTestId('btn-open-start-timer')).toBeDisabled();
  });

  it('bắt đầu đồng hồ: báo lỗi khi ghi chú để trống, không gọi API', async () => {
    vi.mocked(timesheetsApi.getMyTimer).mockResolvedValue(null);

    render(<TimerWidget projectId={1} taskId={20} canStart onStopped={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('btn-open-start-timer'));
    fireEvent.click(screen.getByTestId('btn-confirm-start-timer'));

    expect(await screen.findByText('Ghi chú không được để trống')).toBeInTheDocument();
    expect(timesheetsApi.startTimer).not.toHaveBeenCalled();
  });

  it('bắt đầu đồng hồ thành công thì gọi startTimer đúng payload và hiện đồng hồ đang chạy', async () => {
    vi.mocked(timesheetsApi.getMyTimer).mockResolvedValue(null);
    vi.mocked(timesheetsApi.startTimer).mockResolvedValue({
      timerId: 40,
      projectId: 1,
      taskId: 20,
      userId: 7,
      startedAt: new Date().toISOString(),
      elapsedHours: 0,
      note: 'Phân tích quy trình hiện tại',
      billable: true,
    });

    render(<TimerWidget projectId={1} taskId={20} canStart onStopped={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('btn-open-start-timer'));
    fireEvent.change(screen.getByTestId('timer-note-input'), { target: { value: 'Phân tích quy trình hiện tại' } });
    fireEvent.click(screen.getByTestId('btn-confirm-start-timer'));

    await waitFor(() =>
      expect(timesheetsApi.startTimer).toHaveBeenCalledWith(1, 20, {
        note: 'Phân tích quy trình hiện tại',
        billable: true,
      })
    );
    expect(await screen.findByTestId('timer-running-badge')).toBeInTheDocument();
  });

  it('hiển thị đồng hồ đang chạy và đếm thời gian tăng dần theo đồng hồ thật', async () => {
    const startedAt = new Date(Date.now() - 65_000).toISOString(); // đã chạy 1 phút 5 giây
    vi.mocked(timesheetsApi.getMyTimer).mockResolvedValue({
      timerId: 40,
      projectId: 1,
      taskId: 20,
      userId: 7,
      startedAt,
      elapsedHours: 1.08,
      note: 'Đang làm việc',
      billable: true,
    });

    render(<TimerWidget projectId={1} taskId={20} canStart onStopped={vi.fn()} onError={vi.fn()} />);

    const initial = (await screen.findByTestId('timer-elapsed')).textContent;
    expect(initial).toMatch(/00:01:0[5-9]/);

    // Đợi hơn 1 giây thật để interval (1000ms) chạy ít nhất một lần rồi so sánh đã tăng lên.
    await waitFor(
      () => {
        expect(screen.getByTestId('timer-elapsed').textContent).not.toBe(initial);
      },
      { timeout: 3000, interval: 200 }
    );
  }, 8000);

  it('dừng đồng hồ của chính công việc đang xem thì gọi stopTimer và onStopped', async () => {
    const onStopped = vi.fn();
    vi.mocked(timesheetsApi.getMyTimer).mockResolvedValue({
      timerId: 40,
      projectId: 1,
      taskId: 20,
      userId: 7,
      startedAt: new Date().toISOString(),
      elapsedHours: 0,
      note: 'Đang làm việc',
      billable: true,
    });
    vi.mocked(timesheetsApi.stopTimer).mockResolvedValue({
      id: 99,
      taskId: 20,
      userId: 7,
      workDate: '2026-09-15',
      hours: 1.5,
      status: 'DRAFT',
      note: 'Đang làm việc',
      billable: true,
      createdAt: '2026-09-15T10:00:00',
    });

    render(<TimerWidget projectId={1} taskId={20} canStart onStopped={onStopped} onError={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('btn-stop-timer'));

    await waitFor(() => expect(timesheetsApi.stopTimer).toHaveBeenCalled());
    expect(onStopped).toHaveBeenCalledWith(expect.objectContaining({ id: 99, hours: 1.5 }));
  });

  it('hiện cảnh báo và cho dừng khi đang bấm giờ cho MỘT CÔNG VIỆC KHÁC', async () => {
    vi.mocked(timesheetsApi.getMyTimer).mockResolvedValue({
      timerId: 41,
      projectId: 2,
      taskId: 99,
      userId: 7,
      startedAt: new Date().toISOString(),
      elapsedHours: 0,
      note: 'Việc khác',
      billable: true,
    });

    render(<TimerWidget projectId={1} taskId={20} canStart onStopped={vi.fn()} onError={vi.fn()} />);

    expect(await screen.findByText(/Đang bấm giờ cho công việc khác \(#99\)/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-stop-other-timer')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-open-start-timer')).not.toBeInTheDocument();
  });

  it('gọi onError khi bắt đầu đồng hồ thất bại (ví dụ đã có phiên khác)', async () => {
    const onError = vi.fn();
    vi.mocked(timesheetsApi.getMyTimer).mockResolvedValue(null);
    vi.mocked(timesheetsApi.startTimer).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('INVALID_STATE', 'Da co dong ho dang chay')
    );

    render(<TimerWidget projectId={1} taskId={20} canStart onStopped={vi.fn()} onError={onError} />);
    fireEvent.click(await screen.findByTestId('btn-open-start-timer'));
    fireEvent.change(screen.getByTestId('timer-note-input'), { target: { value: 'Ghi chu' } });
    fireEvent.click(screen.getByTestId('btn-confirm-start-timer'));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Da co dong ho dang chay'));
  });
});
