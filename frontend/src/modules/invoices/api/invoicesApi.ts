import type { RecurringScheduleReq, RecurringScheduleRes } from '../types/invoiceTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class InvoicesApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'InvoicesApiError';
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
    throw new InvoicesApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    throw new InvoicesApiError(code, message, response.status);
  }

  return payload.data as T;
}

/** GET /contracts/{contractId}/recurring-invoice-schedule — lịch hóa đơn định kỳ hiện tại. */
export async function getRecurringSchedule(contractId: number): Promise<RecurringScheduleRes> {
  return requestBackend<RecurringScheduleRes>(
    `${API_BASE_URL}/contracts/${contractId}/recurring-invoice-schedule`,
    { method: 'GET' }
  );
}

/** POST /contracts/{contractId}/recurring-invoice-schedule — tạo lịch hóa đơn định kỳ mới. */
export async function createRecurringSchedule(
  contractId: number,
  req: RecurringScheduleReq
): Promise<RecurringScheduleRes> {
  return requestBackend<RecurringScheduleRes>(
    `${API_BASE_URL}/contracts/${contractId}/recurring-invoice-schedule`,
    { method: 'POST', body: JSON.stringify(req) }
  );
}

/** PUT /contracts/{contractId}/recurring-invoice-schedule — sửa lịch hóa đơn định kỳ. */
export async function updateRecurringSchedule(
  contractId: number,
  req: RecurringScheduleReq
): Promise<RecurringScheduleRes> {
  return requestBackend<RecurringScheduleRes>(
    `${API_BASE_URL}/contracts/${contractId}/recurring-invoice-schedule`,
    { method: 'PUT', body: JSON.stringify(req) }
  );
}
