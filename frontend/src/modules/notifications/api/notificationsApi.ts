import type { NotificationRes } from '../types/notificationTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class NotificationsApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'NotificationsApiError';
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
    throw new NotificationsApiError('NETWORK_ERROR', `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}).`, 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    let message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    if (response.status === 401) message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (payload.fieldErrors && payload.fieldErrors.length > 0) {
      const first = payload.fieldErrors[0];
      message = `${first.message} (${first.field})`;
    }
    throw new NotificationsApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

/**
 * Danh sách thông báo in-app của chính mình, phân trang, mới nhất trước.
 * GET /notifications?unreadOnly=...&page=...&size=...
 */
export async function getNotifications(
  unreadOnly = false,
  page = 0,
  size = 20
): Promise<NotificationRes[]> {
  const params = new URLSearchParams({
    unreadOnly: String(unreadOnly),
    page: String(page),
    size: String(size),
  });
  return requestBackend<NotificationRes[]>(`${API_BASE_URL}/notifications?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * Số lượng thông báo chưa đọc của chính mình — nguồn cho chấm đỏ trên chuông thông báo.
 * GET /notifications/unread-count
 */
export async function getUnreadCount(): Promise<number> {
  return requestBackend<number>(`${API_BASE_URL}/notifications/unread-count`, {
    method: 'GET',
  });
}

/**
 * Đánh dấu một hoặc nhiều thông báo đã đọc.
 * POST /notifications/read
 */
export async function markNotificationsRead(notificationIds: number[]): Promise<void> {
  await requestBackend<null>(`${API_BASE_URL}/notifications/read`, {
    method: 'POST',
    body: JSON.stringify({ notificationIds }),
  });
}
