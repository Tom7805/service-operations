import type {
  TimeEntryCreateReq,
  TimeEntryRes,
  TimeEntryTaskRes,
  TimeEntryUpdateReq,
  TimesheetSummaryRes,
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
