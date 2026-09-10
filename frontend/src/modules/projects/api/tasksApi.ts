import type { TaskAssignment, TaskAssignmentPayload, WorkBreakdownNode } from '../types/taskTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class TasksApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'TasksApiError';
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
    throw new TasksApiError(
      'NETWORK_ERROR',
      'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ máy chủ.',
      503
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const code = payload.errorCode || payload.code || 'UNKNOWN_ERROR';
    const message = payload.message || 'Đã có lỗi xảy ra khi gọi dịch vụ máy chủ Backend.';
    throw new TasksApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

export async function getProjectWorkBreakdown(projectId: number): Promise<WorkBreakdownNode[]> {
  return requestBackend<WorkBreakdownNode[]>(`${API_BASE_URL}/projects/${projectId}/work-breakdown`, {
    method: 'GET',
  });
}

export async function getTaskAssignments(projectId: number, taskId: number): Promise<TaskAssignment[]> {
  return requestBackend<TaskAssignment[]>(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/assignments`, {
    method: 'GET',
  });
}

export async function assignTaskToStaff(
  projectId: number,
  taskId: number,
  payload: TaskAssignmentPayload
): Promise<TaskAssignment[]> {
  return requestBackend<TaskAssignment[]>(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}/assignments`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
