import type { CreateUserPayload, UpdateUserPayload, User, UserStatus } from '../types/userTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class UserApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'UserApiError';
  }
}

async function requestBackend<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new UserApiError(
      'NETWORK_ERROR',
      'Không thể kết nối đến máy chủ Backend (http://localhost:8080/api/v1). Vui lòng kiểm tra lại dịch vụ máy chủ.',
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
    throw new UserApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

export async function getUsers(keyword?: string): Promise<User[]> {
  const url = new URL(`${API_BASE_URL}/users`);
  if (keyword && keyword.trim()) {
    url.searchParams.append('keyword', keyword.trim());
  }
  return requestBackend<User[]>(url.toString(), { method: 'GET' });
}

export async function getUserById(id: number): Promise<User> {
  return requestBackend<User>(`${API_BASE_URL}/users/${id}`, { method: 'GET' });
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  return requestBackend<User>(`${API_BASE_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
  return requestBackend<User>(`${API_BASE_URL}/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatus(id: number, status: UserStatus): Promise<User> {
  return requestBackend<User>(`${API_BASE_URL}/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
