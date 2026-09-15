import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimeEntryPage from '../pages/TimeEntryPage';
import * as timesheetsApi from '../api/timesheetsApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { TimeEntryRes, TimesheetSummaryRes } from '../types/timesheetTypes';
import { addDays, getMondayOf } from '../utils/weekRange';

function localTodayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
    getMyWeekTimeEntries: vi.fn(),
    createTimeEntry: vi.fn(),
    updateTimeEntry: vi.fn(),
    deleteTimeEntry: vi.fn(),
    getMyTimer: vi.fn().mockResolvedValue(null),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    TimesheetsApiError: MockTimesheetsApiError,
  };
});

vi.mock('../../projects/api/projectsApi', () => {
  class MockProjectsApiError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'ProjectsApiError';
    }
  }

  return {
    getProject: vi.fn(),
    ProjectsApiError: MockProjectsApiError,
  };
});

// Tuần hiện tại (thứ Hai → Chủ nhật) tính động theo ngày chạy test thật, tránh phải giả lập
// đồng hồ hệ thống (giả lập timer xung đột với cơ chế polling của `waitFor`).
const CURRENT_WEEK_FROM = getMondayOf();
const CURRENT_WEEK_TO = addDays(CURRENT_WEEK_FROM, 6);
// Luôn dùng đúng "hôm nay" (thay vì offset cố định trong tuần) để chắc chắn không rơi vào
// tương lai — form chặn ngày làm việc ở tương lai (`max` + validateTimeEntryCreateForm).
const ENTRY_DATE = localTodayIso();
const PREV_WEEK_FROM = addDays(CURRENT_WEEK_FROM, -7);
const PREV_WEEK_TO = addDays(CURRENT_WEEK_FROM, -1);

const mockProjectRunning: ProjectRes = {
  id: 1,
  projectCode: 'PRJ-2026-001',
  name: 'Triển khai CRM cho Khách hàng Alpha',
  contractId: 10,
  customerId: 100,
  projectType: 'STANDARD',
  limitValue: null,
  startDate: '2026-05-01',
  expectedEndDate: '2026-12-31',
  projectManagerId: 5,
  status: 'RUNNING',
  createdAt: '2026-05-01T08:00:00',
};

const mockProjectClosed: ProjectRes = { ...mockProjectRunning, status: 'CLOSED' };

const draftEntry: TimeEntryRes = {
  id: 30,
  taskId: 20,
  userId: 7,
  workDate: ENTRY_DATE,
  hours: 5,
  status: 'DRAFT',
  note: 'Phân tích quy trình hiện tại',
  billable: true,
  createdAt: `${ENTRY_DATE}T17:00:00`,
};

function summaryWith(entries: TimeEntryRes[]): TimesheetSummaryRes[] {
  return [
    {
      taskId: 20,
      taskName: 'Phỏng vấn người dùng',
      weekFrom: CURRENT_WEEK_FROM,
      weekTo: CURRENT_WEEK_TO,
      entries,
      totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
      budgetHours: 8,
      approvedHours: 0,
      usageRatio: 0.625,
      overBudgetWarning: false,
    },
  ];
}

describe('TimeEntryPage (NCL-06-CN-001 — Ghi giờ công theo công việc)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-03: hiển thị Access Denied cho vai trò khác VT-03', () => {
    render(<TimeEntryPage projectId={1} taskId={20} currentUserRoles={['VT-02']} />);

    expect(screen.getByTestId('time-entry-forbidden')).toBeInTheDocument();
    expect(timesheetsApi.getMyWeekTimeEntries).not.toHaveBeenCalled();
  });

  it('tải và hiển thị bản ghi giờ công của tuần hiện tại cho đúng công việc', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue(summaryWith([draftEntry]));

    render(<TimeEntryPage projectId={1} taskId={20} taskName="Phỏng vấn người dùng" currentUserRoles={['VT-03']} />);

    await waitFor(() => {
      expect(screen.getByTestId('entry-row-30')).toBeInTheDocument();
    });

    expect(timesheetsApi.getMyWeekTimeEntries).toHaveBeenCalledWith(CURRENT_WEEK_FROM, CURRENT_WEEK_TO);
    expect(screen.getByTestId('entry-row-30')).toHaveTextContent(ENTRY_DATE);
    expect(screen.getByTestId('entry-row-30')).toHaveTextContent('5');
    expect(screen.getByTestId('entry-status-30')).toHaveTextContent('Nháp');
  });

  it('hiển thị trạng thái rỗng khi công việc chưa có bản ghi nào trong tuần', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([]);

    render(<TimeEntryPage projectId={1} taskId={20} currentUserRoles={['VT-03']} />);

    await waitFor(() => {
      expect(screen.getByTestId('time-entry-empty')).toBeInTheDocument();
    });
  });

  it('ẩn nút ghi giờ công và hiện cảnh báo khi dự án đã đóng', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectClosed);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue(summaryWith([draftEntry]));

    render(<TimeEntryPage projectId={1} taskId={20} currentUserRoles={['VT-03']} />);

    await waitFor(() => {
      expect(screen.getByTestId('time-entry-project-closed-alert')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('btn-add-time-entry')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-edit-entry-30')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-delete-entry-30')).not.toBeInTheDocument();
    // NCL-06-CN-007: vẫn xem lại được bản ghi giờ công cũ dù dự án đã đóng — chỉ chặn
    // ghi mới/sửa/xóa, không ẩn dữ liệu lịch sử.
    expect(screen.getByTestId('entry-row-30')).toBeInTheDocument();
  });

  it('TC-01: mở form, điền dữ liệu và ghi giờ công mới thành công', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([]);
    vi.mocked(timesheetsApi.createTimeEntry).mockResolvedValue(draftEntry);

    render(<TimeEntryPage projectId={1} taskId={20} taskName="Phỏng vấn người dùng" currentUserRoles={['VT-03']} />);
    await waitFor(() => expect(screen.getByTestId('time-entry-empty')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-add-time-entry'));
    fireEvent.change(screen.getByLabelText(/Ngày làm việc/i), { target: { value: ENTRY_DATE } });
    fireEvent.change(screen.getByLabelText(/Số giờ công/i), { target: { value: '3.5' } });
    fireEvent.change(screen.getByLabelText(/Ghi chú/i), { target: { value: 'Phân tích quy trình hiện tại' } });

    fireEvent.click(screen.getByTestId('submit-time-entry-btn'));

    await waitFor(() => {
      expect(timesheetsApi.createTimeEntry).toHaveBeenCalledWith(1, 20, {
        workDate: ENTRY_DATE,
        hours: 3.5,
        note: 'Phân tích quy trình hiện tại',
        billable: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('time-entry-toast')).toHaveTextContent('Đã ghi giờ công thành công');
    });
  });

  it('phát hiện trùng ngày trên FE và chuyển sang sửa bản ghi có sẵn thay vì tạo mới', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue(summaryWith([draftEntry]));

    render(<TimeEntryPage projectId={1} taskId={20} currentUserRoles={['VT-03']} />);
    await waitFor(() => expect(screen.getByTestId('entry-row-30')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-add-time-entry'));
    fireEvent.change(screen.getByLabelText(/Ngày làm việc/i), { target: { value: ENTRY_DATE } });
    fireEvent.change(screen.getByLabelText(/Số giờ công/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Ghi chú/i), { target: { value: 'Thử ghi trùng ngày' } });
    fireEvent.click(screen.getByTestId('submit-time-entry-btn'));

    expect(await screen.findByTestId('time-entry-duplicate-alert')).toBeInTheDocument();
    expect(timesheetsApi.createTimeEntry).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('btn-switch-to-edit-duplicate'));
    expect(screen.getByTestId('submit-time-entry-btn')).toHaveTextContent('Lưu thay đổi');
    expect((screen.getByLabelText(/Số giờ công/i) as HTMLInputElement).value).toBe('5');
  });

  it('sửa bản ghi DRAFT của mình và gọi updateTimeEntry', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue(summaryWith([draftEntry]));
    vi.mocked(timesheetsApi.updateTimeEntry).mockResolvedValue({ ...draftEntry, hours: 6 });

    render(<TimeEntryPage projectId={1} taskId={20} currentUserRoles={['VT-03']} />);
    await waitFor(() => expect(screen.getByTestId('entry-row-30')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-edit-entry-30'));
    const hoursInput = screen.getByLabelText(/Số giờ công/i) as HTMLInputElement;
    expect(hoursInput.value).toBe('5');
    expect((screen.getByLabelText(/Ngày làm việc/i) as HTMLInputElement).disabled).toBe(true);

    fireEvent.change(hoursInput, { target: { value: '6' } });
    fireEvent.click(screen.getByTestId('submit-time-entry-btn'));

    await waitFor(() => {
      expect(timesheetsApi.updateTimeEntry).toHaveBeenCalledWith(1, 20, 30, {
        hours: 6,
        note: 'Phân tích quy trình hiện tại',
        billable: true,
      });
    });
  });

  it('xóa bản ghi DRAFT khi xác nhận, không gọi API khi hủy xác nhận', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue(summaryWith([draftEntry]));
    vi.mocked(timesheetsApi.deleteTimeEntry).mockResolvedValue();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<TimeEntryPage projectId={1} taskId={20} currentUserRoles={['VT-03']} />);
    await waitFor(() => expect(screen.getByTestId('btn-delete-entry-30')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-delete-entry-30'));
    expect(timesheetsApi.deleteTimeEntry).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('btn-delete-entry-30'));

    await waitFor(() => {
      expect(timesheetsApi.deleteTimeEntry).toHaveBeenCalledWith(1, 20, 30);
    });

    confirmSpy.mockRestore();
  });

  it('không cho sửa/xoá bản ghi đã SUBMITTED', async () => {
    const submittedEntry: TimeEntryRes = { ...draftEntry, status: 'SUBMITTED' };
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue(summaryWith([submittedEntry]));

    render(<TimeEntryPage projectId={1} taskId={20} currentUserRoles={['VT-03']} />);
    await waitFor(() => expect(screen.getByTestId('entry-row-30')).toBeInTheDocument());

    expect(screen.getByTestId('entry-status-30')).toHaveTextContent('Đã nộp');
    expect(screen.queryByTestId('btn-edit-entry-30')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-delete-entry-30')).not.toBeInTheDocument();
  });

  it('chuyển tuần bằng nút Tuần trước/Tuần sau và gọi lại API với khoảng ngày mới', async () => {
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([]);

    render(<TimeEntryPage projectId={1} taskId={20} currentUserRoles={['VT-03']} />);
    await waitFor(() => {
      expect(timesheetsApi.getMyWeekTimeEntries).toHaveBeenCalledWith(CURRENT_WEEK_FROM, CURRENT_WEEK_TO);
    });

    fireEvent.click(screen.getByTestId('btn-week-prev'));

    await waitFor(() => {
      expect(timesheetsApi.getMyWeekTimeEntries).toHaveBeenCalledWith(PREV_WEEK_FROM, PREV_WEEK_TO);
    });
  });

  it('hiển thị lỗi khi tải dữ liệu thất bại', async () => {
    vi.mocked(projectsApi.getProject).mockRejectedValue(
      new projectsApi.ProjectsApiError('RESOURCE_NOT_FOUND', 'Không tìm thấy dự án', 404)
    );
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([]);

    render(<TimeEntryPage projectId={999} taskId={20} currentUserRoles={['VT-03']} />);

    await waitFor(() => {
      expect(screen.getByTestId('time-entry-load-error')).toHaveTextContent('Không tìm thấy dự án');
    });
  });
});
