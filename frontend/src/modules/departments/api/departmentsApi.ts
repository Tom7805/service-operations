import type {
  CreateDepartmentPayload,
  Department,
  DepartmentTreeNode,
  MoveDepartmentPayload,
  UpdateDepartmentPayload,
} from '../types/departmentTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class DepartmentApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'DepartmentApiError';
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
    throw new DepartmentApiError(
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
    throw new DepartmentApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

export async function getDepartmentTree(): Promise<DepartmentTreeNode[]> {
  const url = `${API_BASE_URL}/departments/tree`;
  return requestBackend<DepartmentTreeNode[]>(url, { method: 'GET' });
}

export async function getDepartments(keyword?: string): Promise<Department[]> {
  const url = new URL(`${API_BASE_URL}/departments`);
  if (keyword && keyword.trim()) {
    url.searchParams.append('keyword', keyword.trim());
  }
  return requestBackend<Department[]>(url.toString(), { method: 'GET' });
}

export async function getDepartmentById(id: number): Promise<Department> {
  return requestBackend<Department>(`${API_BASE_URL}/departments/${id}`, { method: 'GET' });
}

export async function createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
  return requestBackend<Department>(`${API_BASE_URL}/departments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDepartment(id: number, payload: UpdateDepartmentPayload): Promise<Department> {
  return requestBackend<Department>(`${API_BASE_URL}/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function moveDepartment(id: number, payload: MoveDepartmentPayload): Promise<Department> {
  return requestBackend<Department>(`${API_BASE_URL}/departments/${id}/move`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDepartment(id: number): Promise<void> {
  return requestBackend<void>(`${API_BASE_URL}/departments/${id}`, {
    method: 'DELETE',
  });
}
