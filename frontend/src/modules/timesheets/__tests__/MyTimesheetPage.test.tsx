import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyTimesheetPage from '../pages/MyTimesheetPage';
import * as timesheetsApi from '../api/timesheetsApi';
import * as projectsApi from '../../projects/api/projectsApi';
import type { ProjectRes } from '../../projects/types/projectTypes';
import type { TimeEntryTaskRes, TimesheetSummaryRes } from '../types/timesheetTypes';
import { addDays, formatIsoDate, getMondayOf } from '../utils/weekRange';

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
    getMyRunningTasks: vi.fn(),
    getMyWeekTimeEntries: vi.fn(),
    createTimeEntry: vi.fn(),
    updateTimeEntry: vi.fn(),
    deleteTimeEntry: vi.fn(),
    submitWeek: vi.fn(),
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

const CURRENT_WEEK_FROM = getMondayOf();
const CURRENT_WEEK_TO = addDays(CURRENT_WEEK_FROM, 6);
const NEXT_WEEK_FROM = addDays(CURRENT_WEEK_FROM, 7);
const NEXT_WEEK_TO = addDays(CURRENT_WEEK_FROM, 13);
const ENTRY_DATE = addDays(CURRENT_WEEK_FROM, 2);

const myTask: TimeEntryTaskRes = {
  projectId: 1,
  projectName: 'Triển khai CRM cho Khách hàng Alpha',
  taskId: 20,
  taskName: 'Phỏng vấn người dùng',
  taskStatus: 'IN_PROGRESS',
};

const summaryTask20: TimesheetSummaryRes = {
  taskId: 20,
  taskName: 'Phỏng vấn người dùng',
  weekFrom: CURRENT_WEEK_FROM,
  weekTo: CURRENT_WEEK_TO,
  entries: [
    {
      id: 30,
      taskId: 20,
      userId: 7,
      workDate: ENTRY_DATE,
      hours: 5,
      status: 'DRAFT',
      note: null,
      billable: true,
      createdAt: `${ENTRY_DATE}T17:00:00`,
    },
  ],
  totalHours: 5,
  budgetHours: 8,
  approvedHours: 0,
  usageRatio: 0.625,
  overBudgetWarning: false,
};

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

describe('MyTimesheetPage (NCL-06-CN-001 — Giờ công của tôi)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-03: hiển thị Access Denied cho vai trò khác VT-03', () => {
    render(<MyTimesheetPage currentUserRoles={['VT-02']} />);
    expect(screen.getByTestId('my-timesheet-forbidden')).toBeInTheDocument();
    expect(timesheetsApi.getMyRunningTasks).not.toHaveBeenCalled();
    expect(timesheetsApi.getMyWeekTimeEntries).not.toHaveBeenCalled();
  });

  it('tải danh sách công việc được giao và bảng giờ công tuần hiện tại, hiển thị tổng giờ', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([myTask]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([summaryTask20]);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);

    await waitFor(() => {
      expect(timesheetsApi.getMyWeekTimeEntries).toHaveBeenCalledWith(CURRENT_WEEK_FROM, CURRENT_WEEK_TO);
    });

    expect(screen.getByTestId('my-task-row-20')).toHaveTextContent('Triển khai CRM cho Khách hàng Alpha');
    expect(screen.getByTestId('my-task-row-20')).toHaveTextContent('Phỏng vấn người dùng');
    expect(await within(await screen.findByTestId('weekly-grid')).findByText('Phỏng vấn người dùng')).toBeInTheDocument();
    expect(screen.getByTestId('grand-total-hours')).toHaveTextContent('5');
    expect(screen.getByTestId('my-timesheet-week-label')).toHaveTextContent(formatIsoDate(CURRENT_WEEK_FROM));
  });

  it('hiển thị trạng thái rỗng khi chưa được giao công việc nào', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([]);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);

    await waitFor(() => {
      expect(screen.getByTestId('my-tasks-empty')).toBeInTheDocument();
    });
  });

  it('chuyển sang tuần sau rồi quay lại tuần này', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([]);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);
    await waitFor(() => {
      expect(timesheetsApi.getMyWeekTimeEntries).toHaveBeenCalledWith(CURRENT_WEEK_FROM, CURRENT_WEEK_TO);
    });

    fireEvent.click(screen.getByTestId('btn-week-next'));
    await waitFor(() => {
      expect(timesheetsApi.getMyWeekTimeEntries).toHaveBeenCalledWith(NEXT_WEEK_FROM, NEXT_WEEK_TO);
    });

    fireEvent.click(screen.getByTestId('btn-week-current'));
    await waitFor(() => {
      expect(timesheetsApi.getMyWeekTimeEntries).toHaveBeenLastCalledWith(CURRENT_WEEK_FROM, CURRENT_WEEK_TO);
    });
  });

  it('bấm "Ghi giờ công" trên một công việc được giao sẽ mở TimeEntryPage đúng dự án/công việc', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([myTask]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([]);
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);
    await waitFor(() => expect(screen.getByTestId('btn-log-time-20')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-log-time-20'));

    expect(await screen.findByTestId('time-entry-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Phỏng vấn người dùng' })).toBeInTheDocument();
    expect(projectsApi.getProject).toHaveBeenCalledWith(1);
  });

  it('bấm "Xem/sửa" trên một dòng trong lưới tuần cũng mở đúng TimeEntryPage', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([myTask]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([summaryTask20]);
    vi.mocked(projectsApi.getProject).mockResolvedValue(mockProjectRunning);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);
    await waitFor(() => expect(screen.getByTestId('btn-open-task-20')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('btn-open-task-20'));

    expect(await screen.findByTestId('time-entry-page')).toBeInTheDocument();
    expect(projectsApi.getProject).toHaveBeenCalledWith(1);
  });

  it('không hiện nút "Xem/sửa" cho công việc đã có giờ công nhưng không còn trong danh sách được giao', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([]); // không còn được giao/task đã đóng
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([summaryTask20]);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);
    await waitFor(() => expect(screen.getByText('Phỏng vấn người dùng')).toBeInTheDocument());

    expect(screen.queryByTestId('btn-open-task-20')).not.toBeInTheDocument();
  });

  it('hiển thị lỗi khi tải dữ liệu thất bại', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.', 401)
    );

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);

    await waitFor(() => {
      expect(screen.getByTestId('my-timesheet-load-error')).toHaveTextContent('Phiên đăng nhập đã hết hạn.');
    });
  });
});

describe('Nộp bảng chấm công tuần (NCL-06-CN-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiện nút "Nộp bảng chấm công" khi tuần có dòng DRAFT', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([myTask]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([summaryTask20]);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);

    expect(await screen.findByTestId('btn-submit-week')).toHaveTextContent('Nộp bảng chấm công (1 dòng)');
  });

  it('ẩn nút "Nộp bảng chấm công" khi tuần trống hoặc không còn dòng DRAFT', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([]);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);

    await waitFor(() => expect(timesheetsApi.getMyWeekTimeEntries).toHaveBeenCalled());
    expect(screen.queryByTestId('btn-submit-week')).not.toBeInTheDocument();
  });

  it('bấm nộp, xác nhận thì gọi submitWeek đúng weekFrom và hiển thị toast thành công', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([myTask]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([summaryTask20]);
    vi.mocked(timesheetsApi.submitWeek).mockResolvedValue({
      id: 50,
      userId: 7,
      weekStartDate: CURRENT_WEEK_FROM,
      weekEndDate: CURRENT_WEEK_TO,
      status: 'PENDING_APPROVAL',
      totalHours: 5,
      submittedBy: 'nv01',
      submittedAt: `${CURRENT_WEEK_TO}T10:00:00`,
    });

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);
    fireEvent.click(await screen.findByTestId('btn-submit-week'));

    // Bấm nút nộp mở hộp thoại xác nhận tuỳ biến (không còn window.confirm mặc định của trình
    // duyệt) — tóm tắt tuần, số dòng và tổng giờ trước khi gọi API thật.
    const modal = await screen.findByTestId('submit-week-confirm-modal');
    expect(modal).toHaveTextContent('1');
    expect(timesheetsApi.submitWeek).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('btn-confirm-submit-week'));

    await waitFor(() => expect(timesheetsApi.submitWeek).toHaveBeenCalledWith(CURRENT_WEEK_FROM));
    expect(await screen.findByTestId('submit-week-toast')).toHaveTextContent('thành công');
    // Nộp xong phải nạp lại dữ liệu tuần để lưới cập nhật trạng thái mới.
    expect(timesheetsApi.getMyWeekTimeEntries).toHaveBeenCalledTimes(2);
    // Và phải tự đóng hộp thoại xác nhận sau khi nộp thành công.
    expect(screen.queryByTestId('submit-week-confirm-modal')).not.toBeInTheDocument();
  });

  it('huỷ hộp thoại xác nhận thì không gọi submitWeek', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([myTask]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([summaryTask20]);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);
    fireEvent.click(await screen.findByTestId('btn-submit-week'));
    await screen.findByTestId('submit-week-confirm-modal');

    fireEvent.click(screen.getByTestId('btn-cancel-submit-week'));

    expect(screen.queryByTestId('submit-week-confirm-modal')).not.toBeInTheDocument();
    expect(timesheetsApi.submitWeek).not.toHaveBeenCalled();
  });

  it('hiển thị toast lỗi khi nộp thất bại (ví dụ vượt 12 giờ/ngày — QTN-14)', async () => {
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([myTask]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([summaryTask20]);
    vi.mocked(timesheetsApi.submitWeek).mockRejectedValue(
      new timesheetsApi.TimesheetsApiError('INVALID_STATE', 'Vuot gioi han 12 gio/ngay tai ngay: 2026-09-09 (14 gio)')
    );

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);
    fireEvent.click(await screen.findByTestId('btn-submit-week'));
    fireEvent.click(await screen.findByTestId('btn-confirm-submit-week'));

    expect(await screen.findByTestId('submit-week-toast')).toHaveTextContent('Vuot gioi han 12 gio/ngay');
    // Nộp lỗi thì giữ nguyên hộp thoại để người dùng thử lại ngay, không phải mở lại từ đầu.
    expect(screen.getByTestId('submit-week-confirm-modal')).toBeInTheDocument();
  });

  it('hiện banner "đang chờ duyệt" khi mọi dòng trong tuần đã SUBMITTED (không còn DRAFT)', async () => {
    const submittedSummary: TimesheetSummaryRes = {
      ...summaryTask20,
      entries: summaryTask20.entries.map((e) => ({ ...e, status: 'SUBMITTED' })),
    };
    vi.mocked(timesheetsApi.getMyRunningTasks).mockResolvedValue([myTask]);
    vi.mocked(timesheetsApi.getMyWeekTimeEntries).mockResolvedValue([submittedSummary]);

    render(<MyTimesheetPage currentUserRoles={['VT-03']} />);

    expect(await screen.findByTestId('submit-week-banner')).toHaveTextContent('đang chờ Quản lý dự án duyệt');
    expect(screen.queryByTestId('btn-submit-week')).not.toBeInTheDocument();
  });
});
