import type { PortalProjectProgressRes, PortalProjectRes } from '../types/portalTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class PortalApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'PortalApiError';
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
    throw new PortalApiError('NETWORK_ERROR', 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.', 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || (response.status === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    // Thông báo máy chủ viết cho nội bộ (không dấu) — cổng dùng câu dành cho khách hàng.
    let message = 'Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.';
    if (response.status === 403) {
      message = 'Bạn không có quyền xem nội dung này.';
    } else if (response.status === 401) {
      message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    throw new PortalApiError(code, message, response.status);
  }

  return payload.data as T;
}

/** NCL-13-CN-002 (TC-01): các dự án của chính khách hàng (đang chạy và đã đóng), mới nhất trước. */
export async function fetchPortalProjects(): Promise<PortalProjectRes[]> {
  return requestBackend<PortalProjectRes[]>(`${API_BASE_URL}/portal/projects`, { method: 'GET' });
}

/**
 * NCL-13-CN-002: tiến độ chi tiết một dự án. Dự án của khách hàng khác — kể cả mã không tồn tại — trả 403 và
 * backend ghi nhật ký lần từ chối (TC-02).
 */
export async function fetchPortalProjectProgress(projectId: number): Promise<PortalProjectProgressRes> {
  return requestBackend<PortalProjectProgressRes>(`${API_BASE_URL}/portal/projects/${projectId}`, { method: 'GET' });
}
