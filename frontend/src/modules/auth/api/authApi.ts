import type { ApiError, AuthSession } from '../types/authTypes';

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
