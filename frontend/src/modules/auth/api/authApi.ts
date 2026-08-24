import type { ApiError, AuthSession, ChangePasswordPayload, ForgotPasswordPayload, ResetPasswordPayload } from '../types/authTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class LoginRequestError extends Error {
  constructor(public readonly details: ApiError, fallbackMessage: string) {
    super(details.message ?? fallbackMessage);
  }
}

export async function login(username: string, password: string): Promise<AuthSession> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new LoginRequestError({}, 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại và thử lại.');
  }

  const payload = await response.json().catch(() => ({})) as { data?: AuthSession } & ApiError;
  if (!response.ok || !payload.data) throw new LoginRequestError(payload, 'Đăng nhập chưa thành công. Vui lòng thử lại.');
  return payload.data;
}

/** NCL-01-CN-008: đổi mật khẩu và khôi phục mật khẩu. */
export class AuthApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function requestAuthBackend<T>(url: string, options: RequestInit = {}, withAuth = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (withAuth) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new AuthApiError(
      'NETWORK_ERROR',
      'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ máy chủ.',
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || 'UNKNOWN_ERROR';
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      message = `${payload.fieldErrors[0].message} (${payload.fieldErrors[0].field})`;
    }
    throw new AuthApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/** NCL-01-CN-008-TC-01: đổi mật khẩu khi đang đăng nhập, chấm dứt mọi phiên (kể cả phiên hiện tại). */
export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await requestAuthBackend<null>(
    `${API_BASE_URL}/auth/change-password`,
    { method: 'POST', body: JSON.stringify(payload) },
    true
  );
}

/** Khởi tạo yêu cầu khôi phục mật khẩu — backend luôn trả 200 dù email có tồn tại hay không. */
export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  await requestAuthBackend<null>(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** NCL-01-CN-008-TC-02: kiểm tra liên kết khôi phục còn hiệu lực trước khi hiển thị form đặt lại. */
export async function validateResetToken(token: string): Promise<boolean> {
  return requestAuthBackend<boolean>(
    `${API_BASE_URL}/auth/reset-password/validate?token=${encodeURIComponent(token)}`,
    { method: 'GET' }
  );
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await requestAuthBackend<null>(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
