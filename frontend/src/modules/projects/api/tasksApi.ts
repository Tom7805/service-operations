import type { TaskRes, TaskStatus } from '../types/taskTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class TaskApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'TaskApiError';
  }
}

async function requestBackend<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new TaskApiError('NETWORK_ERROR', 'Không thể kết nối đến máy chủ backend.', 503);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code =
      payload.errorCode ||
      payload.code ||
      (response.status === 403
        ? 'FORBIDDEN'
        : response.status === 404
        ? 'RESOURCE_NOT_FOUND'
        : response.status === 401
        ? 'UNAUTHORIZED'
        : response.status === 400
        ? 'VALIDATION_ERROR'
        : 'UNKNOWN_ERROR');

    let message = payload.message;

    if (!message) {
      if (response.status === 403) {
        message = 'Bạn không phải người phụ trách công việc này';
      } else if (response.status === 404) {
        message = 'Không tìm thấy dự án hoặc công việc tương ứng.';
      } else if (response.status === 401) {
        message = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (response.status === 400) {
        message = 'Trạng thái công việc không hợp lệ.';
      } else {
        message = 'Đã có lỗi xảy ra khi cập nhật tiến độ công việc.';
      }
    }

    throw new TaskApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data ?? payload;
}

export async function updateTaskProgress(
  projectId: number,
  taskId: number,
  status: TaskStatus
): Promise<TaskRes> {
  const res = await requestBackend<{ success: boolean; data: TaskRes }>(
    `${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/progress`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );

  return res.data;
}
