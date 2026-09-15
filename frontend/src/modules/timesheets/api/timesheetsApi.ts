import type {
  AdjustmentTraceRes,
  PendingTimesheetRes,
  PeriodLockReq,
  TimeEntryAdjustmentReq,
  TimeEntryCreateReq,
  TimeEntryRes,
  TimeEntryTaskRes,
  TimeEntryUpdateReq,
  TimerRes,
  TimerStartReq,
  TimesheetApprovalRes,
  TimesheetApproveReq,
  TimesheetPeriodRes,
  TimesheetRejectReq,
  TimesheetRejectRes,
  TimesheetRes,
  TimesheetSummaryRes,
  UnsubmittedTimesheetRes,
} from '../types/timesheetTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class TimesheetsApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'TimesheetsApiError';
  }
}

async function requestBackend<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new TimesheetsApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) message = payload.message || 'Bạn không có quyền thực hiện thao tác này.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const first = payload.fieldErrors[0];
      message = `${first.message} (${first.field})`;
    }
    throw new TimesheetsApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * NCL-06-CN-001: danh sách công việc đang được giao cho chính mình trong các dự án đang
 * RUNNING — nguồn dữ liệu cho danh sách chọn dự án/công việc khi ghi giờ công.
 * GET /me/time-entry-tasks
 */
export async function getMyRunningTasks(): Promise<TimeEntryTaskRes[]> {
  return requestBackend<TimeEntryTaskRes[]>(`${API_BASE_URL}/me/time-entry-tasks`, {
    method: 'GET',
  });
}

/**
 * NCL-06-CN-001 / TC-01: ghi giờ công cho một công việc trong một ngày. Yêu cầu vai trò
 * Nhân viên chuyên môn (VT-03) và phải là người đang được giao công việc (TC-02); dự án
 * phải đang RUNNING. Ghi trùng (công việc, ngày) nhận `409 DUPLICATE_DATA`.
 * POST /projects/{projectId}/tasks/{taskId}/time-entries
 */
export async function createTimeEntry(
  projectId: number,
  taskId: number,
  payload: TimeEntryCreateReq
): Promise<TimeEntryRes> {
  return requestBackend<TimeEntryRes>(
    `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/time-entries`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * NCL-06-CN-001: ghi đè số giờ/ghi chú/tính phí của bản ghi DRAFT của chính mình. Ngày làm
 * việc và công việc không đổi được qua API này.
 * PUT /projects/{projectId}/tasks/{taskId}/time-entries/{entryId}
 */
export async function updateTimeEntry(
  projectId: number,
  taskId: number,
  entryId: number,
  payload: TimeEntryUpdateReq
): Promise<TimeEntryRes> {
  return requestBackend<TimeEntryRes>(
    `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/time-entries/${entryId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * NCL-06-CN-001: xoá bản ghi giờ công DRAFT của chính mình.
 * DELETE /projects/{projectId}/tasks/{taskId}/time-entries/{entryId}
 */
export async function deleteTimeEntry(projectId: number, taskId: number, entryId: number): Promise<void> {
  await requestBackend<null>(
    `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/time-entries/${entryId}`,
    { method: 'DELETE' }
  );
}

/**
 * NCL-06-CN-001: lưới giờ công của chính mình trong một khoảng ngày (tuần chấm công),
 * nhóm theo công việc, kèm cảnh báo vượt ngân sách (QTN-20).
 * GET /me/time-entries?weekFrom=...&weekTo=...
 */
export async function getMyWeekTimeEntries(weekFrom: string, weekTo: string): Promise<TimesheetSummaryRes[]> {
  const params = new URLSearchParams({ weekFrom, weekTo });
  return requestBackend<TimesheetSummaryRes[]>(`${API_BASE_URL}/me/time-entries?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * NCL-06-CN-002: nộp bảng chấm công tuần bắt đầu từ `weekStartDate` (thứ Hai, khớp
 * `weekFrom` của lưới tuần). Toàn bộ dòng DRAFT trong tuần chuyển sang SUBMITTED và bảng
 * tuần chuyển PENDING_APPROVAL cho PM duyệt. Không nộp lại được khi đã PENDING_APPROVAL/
 * APPROVED — bảng REJECTED thì nộp lại được.
 * POST /me/timesheets/{weekStartDate}/submit
 */
export async function submitWeek(weekStartDate: string): Promise<TimesheetRes> {
  return requestBackend<TimesheetRes>(`${API_BASE_URL}/me/timesheets/${weekStartDate}/submit`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * NCL-06-CN-003: hàng chờ duyệt của Quản lý dự án (VT-02) hiện tại — các bảng
 * PENDING_APPROVAL có ít nhất một dòng SUBMITTED thuộc dự án mình quản lý.
 * GET /timesheets/pending
 */
export async function getPendingTimesheets(): Promise<PendingTimesheetRes[]> {
  return requestBackend<PendingTimesheetRes[]>(`${API_BASE_URL}/timesheets/pending`, {
    method: 'GET',
  });
}

/**
 * NCL-06-CN-003: duyệt bảng chấm công. Bỏ trống `entryIds` trong payload = duyệt nguyên
 * bảng (mọi dòng SUBMITTED thuộc dự án PM quản lý); vẫn thành công dù có công việc vượt
 * ngân sách — xem `overBudgetWarnings` trong kết quả trả về.
 * POST /timesheets/{timesheetId}/approve
 */
export async function approveTimesheet(
  timesheetId: number,
  payload: TimesheetApproveReq = {}
): Promise<TimesheetApprovalRes> {
  return requestBackend<TimesheetApprovalRes>(`${API_BASE_URL}/timesheets/${timesheetId}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-06-CN-004: từ chối bảng chấm công — bắt buộc `reason`. Bỏ trống `entryIds` = từ chối
 * nguyên bảng; dòng bị từ chối quay về DRAFT để nhân viên sửa và nộp lại.
 * POST /timesheets/{timesheetId}/reject
 */
export async function rejectTimesheet(
  timesheetId: number,
  payload: TimesheetRejectReq
): Promise<TimesheetRejectRes> {
  return requestBackend<TimesheetRejectRes>(`${API_BASE_URL}/timesheets/${timesheetId}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-06-CN-005: điều chỉnh một dòng giờ công đã duyệt bằng bút toán đảo (QTN-11). Chỉ điều
 * chỉnh được dòng gốc đang APPROVED, thuộc dự án PM quản lý; kỳ chấm công chứa ngày làm việc
 * của dòng gốc không được khóa (NCL-06-CN-006).
 * POST /projects/{projectId}/tasks/{taskId}/time-entries/{entryId}/reversal
 */
export async function adjustTimeEntry(
  projectId: number,
  taskId: number,
  entryId: number,
  payload: TimeEntryAdjustmentReq
): Promise<AdjustmentTraceRes> {
  return requestBackend<AdjustmentTraceRes>(
    `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/time-entries/${entryId}/reversal`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * NCL-06-CN-005: lịch sử điều chỉnh của một công việc, mới nhất trước. Gọi được cũng là
 * cách xác nhận `projectId`/`taskId` hợp lệ và thuộc dự án PM quản lý trước khi tạo điều
 * chỉnh mới (400/403/404 nếu sai).
 * GET /projects/{projectId}/tasks/{taskId}/adjustments
 */
export async function getAdjustmentHistory(projectId: number, taskId: number): Promise<AdjustmentTraceRes[]> {
  return requestBackend<AdjustmentTraceRes[]>(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/adjustments`, {
    method: 'GET',
  });
}

/**
 * NCL-06-CN-006: danh sách kỳ chấm công, mới nhất trước.
 * GET /timesheet-periods
 */
export async function getTimesheetPeriods(): Promise<TimesheetPeriodRes[]> {
  return requestBackend<TimesheetPeriodRes[]>(`${API_BASE_URL}/timesheet-periods`, {
    method: 'GET',
  });
}

/**
 * NCL-06-CN-006: khóa kỳ chấm công của một tháng — nếu kỳ chưa tồn tại thì tự tạo rồi khóa
 * luôn. Chặn khóa nếu còn bảng chấm công PENDING_APPROVAL giao với khoảng ngày của kỳ.
 * POST /timesheet-periods/lock
 */
export async function lockTimesheetPeriod(payload: PeriodLockReq): Promise<TimesheetPeriodRes> {
  return requestBackend<TimesheetPeriodRes>(`${API_BASE_URL}/timesheet-periods/lock`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-06-CN-006: mở lại một kỳ chấm công đã khóa.
 * POST /timesheet-periods/{periodId}/unlock
 */
export async function unlockTimesheetPeriod(periodId: number): Promise<TimesheetPeriodRes> {
  return requestBackend<TimesheetPeriodRes>(`${API_BASE_URL}/timesheet-periods/${periodId}/unlock`, {
    method: 'POST',
  });
}

/**
 * NCL-06-CN-008: bắt đầu đồng hồ bấm giờ cho một công việc. Mỗi nhân sự chỉ có một phiên
 * đang chạy — bắt đầu khi đang có phiên khác nhận 400 INVALID_STATE.
 * POST /projects/{projectId}/tasks/{taskId}/time-entry-timer
 */
export async function startTimer(projectId: number, taskId: number, payload: TimerStartReq): Promise<TimerRes> {
  return requestBackend<TimerRes>(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/time-entry-timer`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * NCL-06-CN-008: phiên đồng hồ bấm giờ đang chạy của chính mình — null nếu không có.
 * GET /me/time-entry-timer
 */
export async function getMyTimer(): Promise<TimerRes | null> {
  return requestBackend<TimerRes | null>(`${API_BASE_URL}/me/time-entry-timer`, {
    method: 'GET',
  });
}

/**
 * NCL-06-CN-008: dừng đồng hồ đang chạy — hệ thống tự tính số giờ từ lúc bắt đầu đến lúc
 * dừng (làm tròn 2 chữ số, tối thiểu 0.01 giờ) và tạo một bản ghi giờ công DRAFT.
 * POST /me/time-entry-timer/stop
 */
export async function stopTimer(): Promise<TimeEntryRes> {
  return requestBackend<TimeEntryRes>(`${API_BASE_URL}/me/time-entry-timer/stop`, {
    method: 'POST',
  });
}

/**
 * NCL-06-CN-009: danh sách nhân sự còn chưa nộp bảng chấm công của tuần bắt đầu từ
 * `weekStartDate` (luôn là một ngày thứ Hai). PM xem được nhân sự của các dự án mình quản
 * lý; nhân viên chuyên môn tự tra cứu chính mình.
 * GET /timesheets/unsubmitted?weekStartDate=...
 */
export async function getUnsubmittedTimesheets(weekStartDate: string): Promise<UnsubmittedTimesheetRes[]> {
  const params = new URLSearchParams({ weekStartDate });
  return requestBackend<UnsubmittedTimesheetRes[]>(`${API_BASE_URL}/timesheets/unsubmitted?${params.toString()}`, {
    method: 'GET',
  });
}
