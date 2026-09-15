import type { TimesheetRes, TimesheetSummary } from '../types/timesheetTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class TimesheetApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'TimesheetApiError';
  }
}

async function requestBackend<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new TimesheetApiError(
      'NETWORK_ERROR',
      'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ máy chủ.',
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || 'UNKNOWN_ERROR';
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const firstFieldErr = payload.fieldErrors[0];
      message = `${firstFieldErr.message} (${firstFieldErr.field})`;
    }
    throw new TimesheetApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/** Lưới giờ công của chính mình trong một tuần, nhóm theo công việc (NCL-06-CN-001). */
export async function getMyWeek(weekFrom: string, weekTo: string): Promise<TimesheetSummary[]> {
  const url = new URL(`${API_BASE_URL}/me/time-entries`);
  url.searchParams.set('weekFrom', weekFrom);
  url.searchParams.set('weekTo', weekTo);
  return requestBackend<TimesheetSummary[]>(url.toString(), { method: 'GET' });
}

/**
 * Nộp bảng chấm công tuần bắt đầu từ {@code weekStartDate} (NCL-06-CN-002).
 * `weekStartDate` phải là ngày đầu tuần (thứ Hai), khớp `weekFrom` của lưới tuần.
 */
export async function submitWeek(weekStartDate: string): Promise<TimesheetRes> {
  return requestBackend<TimesheetRes>(`${API_BASE_URL}/me/timesheets/${weekStartDate}/submit`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
