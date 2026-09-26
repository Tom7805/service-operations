/** Gọi API dùng chung cho các màn quản trị Epic NCL-15 (danh mục dịch vụ, cấu hình công ty…). */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export interface FieldError {
  field: string;
  message: string;
}

export class AdminApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors: FieldError[] = []
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function requestBackend<T>(url: string, options: RequestInit = {}): Promise<T> {
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
    throw new AdminApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (response.status === 403) message = 'Bạn không có quyền thực hiện thao tác này.';
    throw new AdminApiError(code, message, response.status, payload.fieldErrors ?? []);
  }

  return payload.data as T;
}
