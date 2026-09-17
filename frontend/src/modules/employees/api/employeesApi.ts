import type {
  AssignableUser,
  Employee,
  EmployeeCreatePayload,
  EmployeeDetail,
  EmployeeHourlyRateCreatePayload,
  EmployeeHourlyRateRes,
  EmployeeUpdatePayload,
  EmploymentContract,
  EmploymentContractCreatePayload,
  ResolvedEmployeeHourlyRateRes,
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

/** Toàn bộ tài khoản trong hệ thống (kèm cờ hasEmployeeProfile) — VT-06 dùng được, không cần quyền /users. */
export async function getAssignableUsers(): Promise<AssignableUser[]> {
  return requestBackend<AssignableUser[]>(`${API_BASE_URL}/employees/assignable-users`, { method: 'GET' });
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

/**
 * POST /employees/{employeeId}/rates — khai báo một mốc chi phí giờ công nội
 * bộ (NCL-07-CN-004, TC-01). Chỉ Nhân sự (VT-06) hoặc Quản trị viên (VT-07);
 * vai trò khác nhận 403 (ghi nhật ký lần từ chối, TC-02). Trùng ngày hiệu lực
 * cho cùng nhân sự trả về 409 DUPLICATE_DATA.
 */
export async function createEmployeeHourlyRate(
  employeeId: number,
  payload: EmployeeHourlyRateCreatePayload
): Promise<EmployeeHourlyRateRes> {
  return requestBackend<EmployeeHourlyRateRes>(`${API_BASE_URL}/employees/${employeeId}/rates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * GET /employees/{employeeId}/rates — lịch sử chi phí giờ công nội bộ, mới
 * nhất trước. Cho phép Nhân sự (VT-06), Kế toán (VT-05), Ban giám đốc (VT-01)
 * hoặc Quản trị viên (VT-07) xem; vai trò khác nhận 403.
 */
export async function fetchEmployeeHourlyRates(employeeId: number): Promise<EmployeeHourlyRateRes[]> {
  return requestBackend<EmployeeHourlyRateRes[]>(`${API_BASE_URL}/employees/${employeeId}/rates`, {
    method: 'GET',
  });
}

/**
 * GET /employees/{employeeId}/rates/resolve?asOf=... — chi phí giờ công áp
 * dụng tại ngày phát sinh dòng giờ công, phục vụ tính giá vốn dự án (QTN-17).
 * `missingCostData: true` (không phải lỗi HTTP) khi `asOf` sớm hơn mọi mốc đã
 * khai báo (TC-03).
 */
export async function resolveEmployeeHourlyRate(
  employeeId: number,
  asOf: string
): Promise<ResolvedEmployeeHourlyRateRes> {
  const url = new URL(`${API_BASE_URL}/employees/${employeeId}/rates/resolve`);
  url.searchParams.set('asOf', asOf);
  return requestBackend<ResolvedEmployeeHourlyRateRes>(url.toString(), { method: 'GET' });
}
