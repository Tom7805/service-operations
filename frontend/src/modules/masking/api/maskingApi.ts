import type { MaskingRule } from '../types/maskingTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class MaskingApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'MaskingApiError';
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
    throw new MaskingApiError(
      'NETWORK_ERROR',
      'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ máy chủ.',
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || 'UNKNOWN_ERROR';
    const message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    throw new MaskingApiError(code, message, response.status);
  }

  return payload.data as T;
}

export async function getMaskingRules(): Promise<MaskingRule[]> {
  return requestBackend<MaskingRule[]>(`${API_BASE_URL}/masking-rules`, { method: 'GET' });
}