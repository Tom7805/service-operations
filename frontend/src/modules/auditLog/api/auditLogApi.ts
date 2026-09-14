import type {
  AuditLogPage,
  AuditLogSearchParams,
  SensitiveAccessLogPage,
  SensitiveAccessLogSearchParams,
} from '../types/auditLogTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class AuditLogApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AuditLogApiError';
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
    throw new AuditLogApiError(
      'NETWORK_ERROR',
      'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ máy chủ.',
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || 'UNKNOWN_ERROR';
    const message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    throw new AuditLogApiError(code, message, response.status);
  }

  return payload.data as T;
}

/** NCL-01-CN-006-TC-01: tra cứu nhật ký truy cập dữ liệu nhạy cảm theo bộ lọc + phân trang. */
export async function searchSensitiveAccessLogs(
  params: SensitiveAccessLogSearchParams
): Promise<SensitiveAccessLogPage> {
  const query = new URLSearchParams();
  if (params.userId != null) query.set('userId', String(params.userId));
  if (params.username) query.set('username', params.username);
  if (params.dataType) query.set('dataType', params.dataType);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 20));

  return requestBackend<SensitiveAccessLogPage>(`${API_BASE_URL}/sensitive-access-logs?${query.toString()}`, {
    method: 'GET',
  });
}

/** Tra cứu nhật ký thao tác nghiệp vụ tổng hợp (Tài khoản, Phân quyền, 2FA...) theo bộ lọc + phân trang. */
export async function searchAuditLogs(params: AuditLogSearchParams): Promise<AuditLogPage> {
  const query = new URLSearchParams();
  if (params.actorUsername) query.set('actorUsername', params.actorUsername);
  if (params.targetType) query.set('targetType', params.targetType);
  if (params.action) query.set('action', params.action);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 20));

  return requestBackend<AuditLogPage>(`${API_BASE_URL}/audit-logs?${query.toString()}`, {
    method: 'GET',
  });
}
