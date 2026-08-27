import type {
  Employee,
  EmployeeCreatePayload,
  EmployeeDetail,
  EmployeeUpdatePayload,
  EmploymentContract,
  EmploymentContractCreatePayload,
} from '../types/employeeTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export class EmployeeApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'EmployeeApiError';
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
    throw new EmployeeApiError(
      'NETWORK_ERROR',
      'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ máy chủ.',
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
    throw new EmployeeApiError(code, message, response.status, payload.fieldErrors);
  }

  return payload.data as T;
}

export async function getEmployees(keyword?: string, departmentId?: number): Promise<Employee[]> {
  const url = new URL(`${API_BASE_URL}/employees`);
  if (keyword && keyword.trim()) {
    url.searchParams.append('keyword', keyword.trim());
  }
  if (departmentId != null) {
    url.searchParams.append('departmentId', String(departmentId));
  }
  return requestBackend<Employee[]>(url.toString(), { method: 'GET' });
}

export async function getEmployeeById(id: number): Promise<EmployeeDetail> {
  return requestBackend<EmployeeDetail>(`${API_BASE_URL}/employees/${id}`, { method: 'GET' });
}

export async function createEmployee(payload: EmployeeCreatePayload): Promise<EmployeeDetail> {
  return requestBackend<EmployeeDetail>(`${API_BASE_URL}/employees`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEmployee(id: number, payload: EmployeeUpdatePayload): Promise<EmployeeDetail> {
  return requestBackend<EmployeeDetail>(`${API_BASE_URL}/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function addEmploymentContract(
  employeeId: number,
  payload: EmploymentContractCreatePayload
): Promise<EmploymentContract> {
  return requestBackend<EmploymentContract>(`${API_BASE_URL}/employees/${employeeId}/contracts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getEmploymentContracts(employeeId: number): Promise<EmploymentContract[]> {
  return requestBackend<EmploymentContract[]>(`${API_BASE_URL}/employees/${employeeId}/contracts`, {
    method: 'GET',
  });
}
