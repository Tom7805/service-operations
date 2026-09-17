import type { ExpenseRejectReq, ExpenseRes } from '../types/expenseTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class ExpensesApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ExpensesApiError';
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
    throw new ExpensesApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
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
    throw new ExpensesApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * NCL-08-CN-002: hàng chờ duyệt của Kế toán (VT-05) — các phiếu chi phí đang `SUBMITTED`,
 * sắp xếp theo ngày phát sinh tăng dần rồi tới mã phiếu.
 * GET /expenses/pending
 */
export async function getPendingExpenses(): Promise<ExpenseRes[]> {
  return requestBackend<ExpenseRes[]>(`${API_BASE_URL}/expenses/pending`, {
    method: 'GET',
  });
}

/**
 * NCL-08-CN-002: duyệt một phiếu chi phí đang `SUBMITTED`. Không cần request body.
 * Phiếu chuyển sang `APPROVED`, chỉ phiếu `APPROVED` được tính vào giá vốn dự án.
 * POST /expenses/{expenseId}/approve
 */
export async function approveExpense(expenseId: number): Promise<ExpenseRes> {
  return requestBackend<ExpenseRes>(`${API_BASE_URL}/expenses/${expenseId}/approve`, {
    method: 'POST',
  });
}

/**
 * NCL-08-CN-002: từ chối một phiếu chi phí đang `SUBMITTED` — `reason` bắt buộc. Phiếu giữ
 * nguyên dữ liệu gốc và lưu lý do để người tạo sửa, nộp lại.
 * POST /expenses/{expenseId}/reject
 */
export async function rejectExpense(expenseId: number, payload: ExpenseRejectReq): Promise<ExpenseRes> {
  return requestBackend<ExpenseRes>(`${API_BASE_URL}/expenses/${expenseId}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
